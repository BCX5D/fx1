import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "../lib/types";
import { authAdapter } from "../lib/auth";

interface AuthValue {
  session: Session | null;
  /** False until the initial session check against the auth source of truth resolves. */
  resolved: boolean;
  authMode: "local" | "server";
  signIn: (email: string, password: string, captchaToken?: string) => Promise<Session>;
  signUp: (name: string, email: string, password: string, captchaToken?: string) => Promise<Session>;
  signOut: () => Promise<void>;
  /** Permanently deletes the current user's account and all owned data, then clears the session. */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [resolved, setResolved] = useState(false);

  // Verify the session against the adapter's source of truth on mount.
  // In server mode this is a real network check (GET /api/auth/session);
  // in local mode it reads the (non-authoritative) preview session.
  useEffect(() => {
    let cancelled = false;
    authAdapter.currentSession().then((s) => {
      if (cancelled) return;
      setSession(s);
      setResolved(true);
    });
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (email: string, password: string, captchaToken?: string) => {
    const s = await authAdapter.signIn(email, password, captchaToken);
    setSession(s);
    return s;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, captchaToken?: string) => {
    const s = await authAdapter.signUp(name, email, password, captchaToken);
    setSession(s);
    return s;
  }, []);

  const signOut = useCallback(async () => {
    await authAdapter.signOut();
    setSession(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await authAdapter.deleteAccount();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, resolved, authMode: authAdapter.mode, signIn, signUp, signOut, deleteAccount }),
    [session, resolved, signIn, signUp, signOut, deleteAccount],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
