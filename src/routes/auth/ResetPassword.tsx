import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../state/AuthContext";
import { authAdapter } from "../../lib/auth";
import { Seo } from "../../lib/seo";

/**
 * Landing page for the link sent by ForgotPassword. Supabase's client
 * detects the recovery token in the URL on load (detectSessionInUrl: true)
 * and establishes a short-lived session for exactly this purpose, so by the
 * time this renders, useAuth() either already has that session or the link
 * was invalid/expired. We wait for `resolved` the same way RequireAuth does,
 * then branch on whether a session actually came through.
 */
export function ResetPassword() {
  const { session, resolved, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await authAdapter.updatePassword(password);
      setDone(true);
      // Sign out of the one-time recovery session so the user's next visit
      // requires their new password, same as any other sign-in.
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthLayout>
        <Seo title="Password Updated — Wirby" description="Your Wirby password has been updated." path="/reset-password" noindex />
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Password updated</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Sign in with your new password to get back to your dashboard.
        </p>
        <Button className="mt-6" size="lg" onClick={() => navigate("/signin", { replace: true })}>
          Go to sign in
        </Button>
      </AuthLayout>
    );
  }

  if (!resolved) {
    return (
      <AuthLayout>
        <Seo title="Reset Your Password — Wirby" description="Set a new password for your Wirby account." path="/reset-password" noindex />
        <p className="text-[15px] text-ink-faint" aria-busy="true" aria-live="polite">Checking your reset link…</p>
      </AuthLayout>
    );
  }

  if (!session) {
    return (
      <AuthLayout>
        <Seo title="Reset Your Password — Wirby" description="Set a new password for your Wirby account." path="/reset-password" noindex />
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">This link is not valid</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Reset links expire after one use or after about an hour. Request a new one to keep going.
        </p>
        <Button to="/forgot-password" className="mt-6" size="lg">Request a new link</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Seo title="Reset Your Password — Wirby" description="Set a new password for your Wirby account." path="/reset-password" noindex />
      <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Set a new password</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Choose something you have not used here before.</p>
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {error && (
          <div role="alert" className="rounded-xl border border-alert-200 bg-alert-100 px-4 py-3 text-sm text-alert-800">
            {error}
          </div>
        )}
        <TextInput
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <TextInput
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type it again"
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy || password.length < 8 || !confirm}>
          {busy ? "Saving…" : "Save new password"}
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
