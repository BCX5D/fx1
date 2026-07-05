import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle } from "@phosphor-icons/react";
import { AuthLayout } from "./AuthLayout";
import { TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { TurnstileWidget } from "../../components/ui/TurnstileWidget";
import { turnstileEnabled } from "../../lib/turnstile";
import { authAdapter } from "../../lib/auth";
import { Seo } from "../../lib/seo";

/**
 * Requests a password-reset email. Deliberately shows the same success
 * state whether or not the address has an account -- this both matches
 * Supabase's own behavior and avoids leaking account existence. Success is
 * its own calm confirmation screen, never routed through the shared error
 * banner used for real failures.
 */
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await authAdapter.requestPasswordReset(email, captchaToken || undefined);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setCaptchaReset((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <Seo title="Reset Your Password — Wirby" description="Request a password reset link for your Wirby account." path="/forgot-password" noindex />
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pine-100 text-pine-700">
          <CheckCircle size={22} weight="fill" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink">Check your email</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          If <span className="font-medium text-ink">{email}</span> has a Wirby account, a reset link is on its way.
          It expires in a hour, so use it soon.
        </p>
        <p className="mt-6 text-sm text-ink-soft">
          <Link to="/signin" className="font-medium text-pine-700 underline hover:no-underline">
            Back to sign in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Seo title="Reset Your Password — Wirby" description="Request a password reset link for your Wirby account." path="/forgot-password" noindex />
      <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Reset your password</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        Enter the email on your account and we will send a link to set a new password.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {error && (
          <div role="alert" className="rounded-xl border border-alert-200 bg-alert-100 px-4 py-3 text-sm text-alert-800">
            {error}
          </div>
        )}
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaReset} />
        <Button type="submit" size="lg" className="w-full" disabled={busy || !email || (turnstileEnabled && !captchaToken)}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        <Link to="/signin" className="font-medium text-pine-700 underline hover:no-underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
