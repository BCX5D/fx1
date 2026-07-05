import { useEffect, useRef } from "react";
import { loadTurnstile, TURNSTILE_SITE_KEY, turnstileEnabled } from "../../lib/turnstile";

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  /** Bump this to force the widget to reset and re-render (e.g. after a failed submit). */
  resetKey?: number;
}

/**
 * Renders a Cloudflare Turnstile challenge when VITE_TURNSTILE_SITE_KEY is
 * configured, and renders nothing otherwise. This is the only bot-resistance
 * UI on auth forms; the actual verification happens server-side in Supabase
 * (see auth.ts / the README's CAPTCHA setup note) -- this widget only ever
 * produces the token, it never itself decides whether a request is allowed.
 */
export function TurnstileWidget({ onToken, resetKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!turnstileEnabled || !containerRef.current) return;
    let cancelled = false;
    loadTurnstile().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY!,
        callback: onToken,
        "error-callback": () => onToken(""),
        "expired-callback": () => onToken(""),
        theme: "light",
      });
    }).catch(() => {
      // If the widget script fails to load (network issue, ad blocker), fail
      // open on the client and let Supabase's own server-side enforcement
      // decide: if CAPTCHA protection is on in the dashboard, the request
      // will be rejected there with a real error the user can retry from.
    });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resetKey !== undefined && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  if (!turnstileEnabled) return null;
  return <div ref={containerRef} className="mt-1" />;
}
