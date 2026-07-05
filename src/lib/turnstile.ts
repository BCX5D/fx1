/**
 * Thin Cloudflare Turnstile loader, mirroring the pattern already used for
 * Paddle.js in src/lib/paddle.ts: no new npm dependency, load the vendor
 * script lazily, and expose a small render/reset API.
 *
 * Why not @marsidev/react-turnstile: one more third-party package for a
 * ~30-line integration is not worth the added supply-chain surface. This
 * file is the entire integration.
 *
 * Turnstile is opt-in: nothing loads or renders unless
 * VITE_TURNSTILE_SITE_KEY is set. Supabase's CAPTCHA enforcement (toggled in
 * the dashboard, see README) is the actual security boundary -- this widget
 * only produces the token Supabase verifies. If the site key is unset, auth
 * forms behave exactly as before (no captchaToken sent).
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js";
let scriptPromise: Promise<void> | null = null;

export function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the verification widget."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
export const turnstileEnabled = !!TURNSTILE_SITE_KEY;
