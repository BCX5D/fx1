/**
 * Thin Paddle.js loader/initializer.
 *
 * Why this file exists (the key architectural difference from the old Stripe
 * integration): Stripe Checkout was opened by redirecting the browser to a
 * server-generated Checkout Session URL -- the frontend never touched the
 * Stripe SDK directly. Paddle has no equivalent "create a session, redirect
 * there" flow for checkout. Instead, Paddle Checkout is opened *client-side*
 * by Paddle.js, which is initialized once per page load with a public
 * client-side token (safe to ship in the bundle, same trust level as the
 * Supabase publishable key -- see https://developer.paddle.com/paddle-js/about/client-side-tokens).
 *
 * This module only loads and initializes Paddle.js. It never decides what a
 * checkout is *for* or who it's *for* -- that identity binding happens
 * server-side in the paddle-customer Edge Function before a checkout is ever
 * opened (see src/lib/billing.ts).
 */

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: "sandbox" | "production") => void };
      Initialize: (opts: {
        token: string;
        eventCallback?: (event: { name: string; data?: unknown }) => void;
      }) => void;
      Checkout: {
        open: (opts: Record<string, unknown>) => void;
        close: () => void;
      };
    };
  }
}

const PADDLE_SCRIPT_URL = "https://cdn.paddle.com/paddle/v2/paddle.js";

type PaddleEventHandler = (event: { name: string; data?: unknown }) => void;
const listeners = new Set<PaddleEventHandler>();

let scriptPromise: Promise<void> | null = null;
let initialized = false;

function loadScript(): Promise<void> {
  if (window.Paddle) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PADDLE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the checkout. Check your connection and try again."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Loads Paddle.js (if not already loaded) and initializes it exactly once
 * per page load. Safe to call on every checkout attempt -- subsequent calls
 * are no-ops beyond re-resolving the already-loaded script.
 */
export async function ensurePaddle(): Promise<Window["Paddle"]> {
  await loadScript();
  const Paddle = window.Paddle;
  if (!Paddle) throw new Error("Could not load the checkout. Please try again.");

  if (!initialized) {
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
    if (!token) throw new Error("Billing is not configured.");
    if (import.meta.env.VITE_PADDLE_ENVIRONMENT === "sandbox") {
      Paddle.Environment.set("sandbox");
    }
    Paddle.Initialize({
      token,
      eventCallback: (event) => {
        for (const fn of listeners) fn(event);
      },
    });
    initialized = true;
  }
  return Paddle;
}

/** Subscribe to Paddle.js events (checkout.completed, checkout.closed, etc). Returns an unsubscribe function. */
export function onPaddleEvent(handler: PaddleEventHandler): () => void {
  listeners.add(handler);
  return () => listeners.delete(handler);
}
