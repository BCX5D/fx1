import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CheckCircle } from "@phosphor-icons/react";
import { AuthLayout } from "./AuthLayout";
import { TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { TurnstileWidget } from "../../components/ui/TurnstileWidget";
import { turnstileEnabled } from "../../lib/turnstile";
import { useAuth } from "../../state/AuthContext";
import { EmailConfirmationRequiredError } from "../../lib/auth";
import { Seo } from "../../lib/seo";

export function SignUp() {
  const { session, signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);

  if (session) return <Navigate to="/app" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signUp(name, email, password, captchaToken || undefined);
      sessionStorage.setItem("wirby:just-authed", "signup");
      navigate("/app", { replace: true });
    } catch (err) {
      if (err instanceof EmailConfirmationRequiredError) {
        // Not a failure: the account was created. Show a distinct success
        // state instead of routing this through the shared error banner.
        setAwaitingConfirmation(true);
        setBusy(false);
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
      setCaptchaReset((n) => n + 1);
    }
  };

  if (awaitingConfirmation) {
    return (
      <AuthLayout>
        <Seo title="Confirm Your Email — Wirby" description="Confirm your email to finish creating your Wirby account." path="/signup" noindex />
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pine-100 text-pine-700">
          <CheckCircle size={22} weight="fill" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink">Check your email</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Your account is created. Follow the confirmation link we sent to{" "}
          <span className="font-medium text-ink">{email}</span>, then come back and sign in.
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
      <Seo
        title="Start Free — Wirby"
        description="Create a free Wirby account and track up to 25 subscriptions, bills, renewals, and deadlines in one ranked list. No card required."
        path="/signup"
        noindex
      />
      <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Start free</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Two minutes to your first calm dashboard.</p>
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {error && (
          <div role="alert" className="rounded-xl border border-alert-200 bg-alert-100 px-4 py-3 text-sm text-alert-800">
            {error}
          </div>
        )}
        <TextInput
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should we call you?"
        />
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <TextInput
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          helper="8 characters minimum. A password manager phrase works best."
        />
        <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaReset} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={busy || !email || password.length < 8 || (turnstileEnabled && !captchaToken)}
        >
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-[13px] leading-relaxed text-ink-faint">
          By creating an account you agree to Wirby's{" "}
          <Link to="/terms" className="text-pine-700 underline hover:no-underline">Terms of Service</Link>{" "}
          and <Link to="/privacy" className="text-pine-700 underline hover:no-underline">Privacy Policy</Link>.
        </p>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link to="/signin" className="font-medium text-pine-700 underline hover:no-underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
