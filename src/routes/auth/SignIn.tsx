import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { TurnstileWidget } from "../../components/ui/TurnstileWidget";
import { turnstileEnabled } from "../../lib/turnstile";
import { useAuth } from "../../state/AuthContext";
import { Seo } from "../../lib/seo";

export function SignIn() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);

  if (session) return <Navigate to="/app" replace />;

  const from = (location.state as { from?: string } | null)?.from ?? "/app";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email, password, captchaToken || undefined);
      sessionStorage.setItem("wirby:just-authed", "signin");
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
      setCaptchaReset((n) => n + 1);
    }
  };

  return (
    <AuthLayout>
      <Seo
        title="Sign In — Wirby"
        description="Sign in to your Wirby dashboard to check what's due and what needs attention."
        path="/signin"
        noindex
      />
      <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Welcome back</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Pick up where your admin left off.</p>
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
        <div>
          <TextInput
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
          <Link to="/forgot-password" className="mt-2 inline-block text-[13px] font-medium text-pine-700 underline hover:no-underline">
            Forgot your password?
          </Link>
        </div>
        <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaReset} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={busy || !email || !password || (turnstileEnabled && !captchaToken)}
        >
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        New here?{" "}
        <Link to="/signup" className="font-medium text-pine-700 underline hover:no-underline">
          Start free
        </Link>
      </p>
    </AuthLayout>
  );
}
