import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../state/AuthContext";
import { Seo } from "../../lib/seo";

/**
 * Landing page for the "Confirm your email" link sent on signup.
 *
 * Supabase's client detects the confirmation token in the URL on load
 * (detectSessionInUrl: true, set in supabase.ts) and establishes a real
 * session automatically -- there is nothing to "confirm" here in code, this
 * page only has to wait for that to resolve and then greet the user. If the
 * link was already used or has expired, no session comes through and we
 * show a calm recovery path instead of a dead end.
 *
 * This is the emailRedirectTo target set in auth.ts's signUp() call, and
 * must also be added to Supabase Dashboard > Authentication > URL
 * Configuration > Redirect URLs (see README) or Supabase will reject the
 * redirect and silently fall back to the Site URL instead.
 */
export function Confirmed() {
  const { session, resolved } = useAuth();
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Tiny deliberate delay so the checkmark's entrance animation always
    // gets to play, even when the session resolves instantly from cache --
    // a flash of "confirmed" with no transition reads as broken, not fast.
    const t = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(t);
  }, []);

  const firstName = (session?.name ?? "").trim().split(" ")[0];

  if (!resolved || !showContent) {
    return (
      <AuthLayout>
        <Seo
          title="Confirming Your Email — Wirby"
          description="Confirming your Wirby account."
          path="/confirmed"
          noindex
        />
        <p className="text-[15px] text-ink-faint" aria-busy="true" aria-live="polite">
          Confirming your email…
        </p>
      </AuthLayout>
    );
  }

  if (!session) {
    return (
      <AuthLayout>
        <Seo
          title="Confirmation Link Not Valid — Wirby"
          description="This email confirmation link has expired or was already used."
          path="/confirmed"
          noindex
        />
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-alert-100 text-alert-700">
          <WarningCircle size={22} weight="fill" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink">
          This link isn't valid
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Confirmation links expire after one use or after a while. If your account is
          already confirmed, just sign in. Otherwise, start over and we'll send a fresh one.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button to="/signin" size="lg">Go to sign in</Button>
          <Button to="/signup" variant="ghost">Start over</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Seo
        title="Email Confirmed — Wirby"
        description="Your Wirby account is confirmed and ready to use."
        path="/confirmed"
        noindex
      />
      <div className="rise flex h-14 w-14 items-center justify-center rounded-full bg-pine-100 text-pine-700">
        <CheckCircle size={30} weight="fill" aria-hidden />
      </div>
      <h1 className="rise mt-5 font-display text-3xl font-medium tracking-tight text-ink" style={{ "--i": 1 } as React.CSSProperties}>
        {firstName ? `You're in, ${firstName}.` : "You're in."}
      </h1>
      <p className="rise mt-2 text-[15px] leading-relaxed text-ink-soft" style={{ "--i": 2 } as React.CSSProperties}>
        Your email is confirmed and your Wirby account is ready. Let's get your first
        bill, subscription, or renewal tracked.
      </p>
      <Button
        className="rise mt-7"
        size="lg"
        style={{ "--i": 3 } as React.CSSProperties}
        onClick={() => navigate("/app", { replace: true })}
      >
        Go to my dashboard
      </Button>
    </AuthLayout>
  );
}
