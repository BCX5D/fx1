import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  useSyncExternalStore, type ReactNode,
} from "react";
import { Store } from "../lib/store";
import type { UserDB } from "../lib/types";
import { fetchSubscription, FREE_SUB, type Subscription } from "../lib/billing";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

interface DataValue {
  store: Store;
  ready: boolean;
  subscription: Subscription;
  /** Re-read subscription from the backend (e.g. after a Lemon Squeezy checkout completes). */
  refreshSubscription: () => void;
}

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) throw new Error("DataProvider requires a session");

  const storeRef = useRef<Store | null>(null);
  const userRef = useRef<string>("");
  if (!storeRef.current || userRef.current !== session.userId) {
    storeRef.current = new Store(session.userId, session.email);
    userRef.current = session.userId;
  }
  const store = storeRef.current;

  const [ready, setReady] = useState(false);
  const [subscription, setSubscription] = useState<Subscription>(FREE_SUB);
  const userId = session.userId;

  const refreshSubscription = useCallback(() => {
    fetchSubscription(userId).then(setSubscription).catch(() => setSubscription(FREE_SUB));
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    Promise.all([store.init(), fetchSubscription(userId)]).then(([, sub]) => {
      if (cancelled) return;
      setSubscription(sub);
      const flag = sessionStorage.getItem("wirby:just-authed");
      if (flag === "signin" || flag === "signup") {
        sessionStorage.removeItem("wirby:just-authed");
        store.log(`auth.${flag}`);
      }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [store, userId]);

  // Live-updates the plan the instant the webhook writes lp_subscriptions
  // (e.g. right after a Lemon Squeezy checkout completes), instead of relying
  // solely on the checkout-return poll in Settings. RLS scopes this to the
  // caller's own row, so no extra filtering is needed beyond matching user_id.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel(`lp_subscriptions:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lp_subscriptions", filter: `user_id=eq.${userId}` },
        () => {
          fetchSubscription(userId).then(setSubscription).catch(() => {});
        },
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [userId]);

  const value = useMemo(
    () => ({ store, ready, subscription, refreshSubscription }),
    [store, ready, subscription, refreshSubscription],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData outside DataProvider");
  return ctx;
}

export function useDB(): UserDB {
  const { store } = useData();
  return useSyncExternalStore(store.subscribe, store.snapshot);
}
