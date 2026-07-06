import type { Session } from "./types";

/**
 * Auth is accessed through a single AuthAdapter interface so the rest of the app
 * never depends on *how* sessions are established or verified.
 *
 * Two implementations ship:
 *   - localAuthAdapter  (VITE_AUTH_MODE unset / "local"): client-only PBKDF2 credential
 *     store for the offline preview. This is NOT production auth: sessions live in
 *     localStorage and are only as trustworthy as the browser they sit in.
 *   - httpAuthAdapter   (VITE_AUTH_MODE="server"): talks to a backend over
 *     credentials-included fetch. The session cookie is httpOnly and set by the server,
 *     so JS never holds a forgeable token and route protection depends on a real
 *     server check (GET /api/auth/session), not client state.
 *
 * `currentSession()` is async on purpose: server verification is a network round-trip.
 */

/**
 * Thrown by signUp() specifically when the account was created but email
 * confirmation is required before a session exists. Callers should catch
 * this separately from real failures and show a calm "check your inbox"
 * success state, not the shared error banner.
 */
export class EmailConfirmationRequiredError extends Error {
  constructor() {
    super("Check your inbox to confirm your email, then sign in.");
    this.name = "EmailConfirmationRequiredError";
  }
}

export interface AuthAdapter {
  readonly mode: "local" | "server";
  /**
   * `captchaToken` is optional and only meaningful for the `supabase` adapter:
   * when Cloudflare Turnstile is configured (VITE_TURNSTILE_SITE_KEY) and
   * Supabase's own CAPTCHA protection is enabled in the dashboard, the token
   * from the widget is forwarded so Supabase can verify it server-side.
   * Other adapters ignore it.
   */
  signUp(name: string, email: string, password: string, captchaToken?: string): Promise<Session>;
  signIn(email: string, password: string, captchaToken?: string): Promise<Session>;
  signOut(): Promise<void>;
  /** Resolves the current session, verifying it against the source of truth. */
  currentSession(): Promise<Session | null>;
  /** Sends a password-reset email with a link back into the app. Always resolves (never reveals whether the address has an account). */
  requestPasswordReset(email: string, captchaToken?: string): Promise<void>;
  /** Sets a new password. Only callable while holding a valid password-recovery session (i.e. after following the reset link). */
  updatePassword(newPassword: string): Promise<void>;
  /** Permanently deletes the current user's account and every row they own. Irreversible. */
  deleteAccount(): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Local preview adapter (dev / offline demo only)                            */
/* -------------------------------------------------------------------------- */

interface StoredUser {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
}

const USERS_KEY = "wirby:users";
const SESSION_KEY = "wirby:session";
const SESSION_DAYS = 7;

function loadUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveHash(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

function makeSession(u: StoredUser): Session {
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  const s: Session = {
    userId: u.id,
    email: u.email,
    name: u.name,
    issuedAt: now.toISOString(),
    expiresAt: exp.toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

function readLocalSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

const localAuthAdapter: AuthAdapter = {
  mode: "local",

  async signUp(name, email, password, _captchaToken) {
    const users = loadUsers();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("That email address does not look right.");
    if (password.length < 8) throw new Error("Password needs at least 8 characters.");
    if (users.some((u) => u.email === normalized)) throw new Error("An account with this email already exists. Try signing in.");
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const hash = await deriveHash(password, salt);
    const user: StoredUser = {
      id: crypto.randomUUID(),
      name: name.trim() || normalized.split("@")[0],
      email: normalized,
      salt,
      hash,
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, user]);
    return makeSession(user);
  },

  async signIn(email, password, _captchaToken) {
    const normalized = email.trim().toLowerCase();
    const user = loadUsers().find((u) => u.email === normalized);
    // constant-shape failure: same message whether the account or the password is wrong
    const fail = () => new Error("Email or password is incorrect.");
    if (!user) throw fail();
    const hash = await deriveHash(password, user.salt);
    if (hash !== user.hash) throw fail();
    return makeSession(user);
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  },

  async currentSession() {
    return readLocalSession();
  },

  async requestPasswordReset(_email, _captchaToken) {
    // No email transport exists in the offline demo. Fail loudly here instead
    // of pretending to send something, since a silent no-op would be the
    // "success routed through a generic error banner" mistake in reverse.
    throw new Error("Password reset by email is not available in this offline preview.");
  },

  async updatePassword(newPassword) {
    const session = readLocalSession();
    if (!session) throw new Error("Your session has expired. Sign in again.");
    if (newPassword.length < 8) throw new Error("Password needs at least 8 characters.");
    const users = loadUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user) throw new Error("Account not found.");
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const hash = await deriveHash(newPassword, salt);
    saveUsers(users.map((u) => (u.id === user.id ? { ...u, salt, hash } : u)));
  },

  async deleteAccount() {
    const session = readLocalSession();
    if (!session) throw new Error("Your session has expired. Sign in again.");
    saveUsers(loadUsers().filter((u) => u.id !== session.userId));
    localStorage.removeItem(`wirby:data:${session.userId}`);
    localStorage.removeItem(SESSION_KEY);
  },
};

/* -------------------------------------------------------------------------- */
/* Server adapter (production)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Server auth. The backend owns credentials and sets an httpOnly, Secure, SameSite
 * session cookie; nothing sensitive is readable from JS. Every call sends
 * `credentials: "include"` so the cookie rides along, and route protection resolves
 * through `currentSession()` -> GET /api/auth/session, i.e. a real server check.
 *
 * Endpoints expected (implement server-side, outside this repo):
 *   POST /api/auth/signup           { name, email, password } -> Session (+ Set-Cookie)
 *   POST /api/auth/signin           { email, password }       -> Session (+ Set-Cookie)
 *   POST /api/auth/signout                                      -> 204   (clears cookie)
 *   GET  /api/auth/session                                      -> Session | 401
 *   POST /api/auth/password-reset-request  { email }           -> 204 (always, regardless of whether the email exists)
 *   POST /api/auth/password-reset-confirm  { token, password } -> 204
 *   POST /api/auth/delete-account                                -> 204 (deletes the authenticated user and all owned data)
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function postJson(path: string, body: unknown): Promise<Session> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* fall through to generic message */
    }
    throw new Error(message);
  }
  return (await res.json()) as Session;
}

async function postVoid(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* fall through to generic message */
    }
    throw new Error(message);
  }
}

const httpAuthAdapter: AuthAdapter = {
  mode: "server",
  signUp: (name, email, password, captchaToken) => postJson("/auth/signup", { name, email, password, captchaToken }),
  signIn: (email, password, captchaToken) => postJson("/auth/signin", { email, password, captchaToken }),
  async signOut() {
    await fetch(`${API_BASE}/auth/signout`, { method: "POST", credentials: "include" });
  },
  async currentSession() {
    try {
      const res = await fetch(`${API_BASE}/auth/session`, { credentials: "include" });
      if (!res.ok) return null;
      return (await res.json()) as Session;
    } catch {
      return null;
    }
  },
  requestPasswordReset: (email, captchaToken) => postVoid("/auth/password-reset-request", { email, captchaToken }),
  updatePassword: (newPassword) => postVoid("/auth/password-reset-confirm", { password: newPassword }),
  deleteAccount: () => postVoid("/auth/delete-account", {}),
};

/* -------------------------------------------------------------------------- */
/* Supabase adapter (production)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Real auth via Supabase. Sessions are JWT-backed and managed by supabase-js;
 * verification and refresh happen against Supabase, and every data query is
 * additionally guarded by RLS policies scoped to auth.uid(). The publishable
 * key is client-safe by design.
 */
import type { Session as SupabaseSession, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

function toSession(sb: SupabaseSession): Session {
  const u: User = sb.user;
  const name = (u.user_metadata?.name as string | undefined)?.trim() || (u.email ?? "").split("@")[0];
  return {
    userId: u.id,
    email: u.email ?? "",
    name,
    issuedAt: new Date((sb.expires_at ?? 0) * 1000 - (sb.expires_in ?? 0) * 1000).toISOString(),
    expiresAt: new Date((sb.expires_at ?? 0) * 1000).toISOString(),
  };
}

/**
 * Map Supabase's auth error messages to Wirby's calm, non-enumerating copy.
 *
 * Order matters here: rate-limit and "too many requests" checks must run
 * BEFORE the generic "email" substring check below, since Supabase's actual
 * message for a rate limit is literally "email rate limit exceeded" / "over
 * email send rate limit" -- that contains the word "email" and would
 * otherwise get misclassified as "that email address does not look right",
 * which is a real bug that shipped and confused real signup attempts.
 */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("already registered") || m.includes("already exists"))
    return "An account with this email already exists. Try signing in.";
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("password")) return "Password needs at least 8 characters.";
  if (m.includes("invalid") && m.includes("email")) return "That email address does not look right.";
  return message;
}

const supabaseAuthAdapter: AuthAdapter = {
  mode: "server",

  async signUp(name, email, password, captchaToken) {
    if (!supabase) throw new Error("Supabase is not configured.");
    if (password.length < 8) throw new Error("Password needs at least 8 characters.");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name: name.trim() },
        captchaToken,
        // Where the confirmation email's link lands after Supabase verifies
        // the token server-side. Without this it defaults to the dashboard's
        // Site URL (the marketing homepage), which is a flat, unbranded
        // landing after a signup -- /confirmed shows a real "you're in"
        // screen instead. Must be added to Authentication > URL Configuration
        // > Redirect URLs in the Supabase dashboard, or Supabase rejects it.
        emailRedirectTo: `${window.location.origin}/confirmed`,
      },
    });
    if (error) throw new Error(friendlyAuthError(error.message));
    if (!data.session) {
      // Email confirmation is enabled on the project; no session is returned yet.
      // This is a distinct, recognizable error type -- not a real failure --
      // so the UI can show a calm "check your inbox" state instead of the
      // shared red error banner.
      throw new EmailConfirmationRequiredError();
    }
    return toSession(data.session);
  },

  async signIn(email, password, captchaToken) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
      options: { captchaToken },
    });
    if (error) throw new Error(friendlyAuthError(error.message));
    return toSession(data.session);
  },

  async signOut() {
    await supabase?.auth.signOut();
  },

  async currentSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session ? toSession(data.session) : null;
  },

  async requestPasswordReset(email, captchaToken) {
    if (!supabase) throw new Error("Supabase is not configured.");
    // Supabase always resolves this call the same way regardless of whether
    // the address has an account, so this adapter can't and shouldn't try to
    // report success/failure differently either -- that would leak account
    // existence. The UI shows one calm confirmation message either way.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken,
    });
    if (error) throw new Error(friendlyAuthError(error.message));
  },

  async updatePassword(newPassword) {
    if (!supabase) throw new Error("Supabase is not configured.");
    if (newPassword.length < 8) throw new Error("Password needs at least 8 characters.");
    // Requires an active recovery session, established by Supabase automatically
    // when the user lands on redirectTo with the token from their email link
    // (detectSessionInUrl: true, already set in supabase.ts).
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(friendlyAuthError(error.message));
  },

  async deleteAccount() {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("delete-account", {
      body: {},
    });
    if (error) throw new Error(error.message || "Could not delete your account.");
    if (!data?.ok) throw new Error(data?.error ?? "Could not delete your account.");
    await supabase.auth.signOut();
  },
};

/* -------------------------------------------------------------------------- */
/* Selection                                                                   */
/* -------------------------------------------------------------------------- */

const mode = import.meta.env.VITE_AUTH_MODE;

// Fail CLOSED, not open: a production build with no real auth mode configured
// must refuse to start rather than silently fall back to the local
// (localStorage, non-server-verified) demo adapter. This throw happens at
// module load time, before any route renders, so there is no window where
// the app runs with unverified sessions in production.
if (mode !== "supabase" && mode !== "server" && import.meta.env.PROD) {
  throw new Error(
    "[Wirby] Production build has no real auth configured (VITE_AUTH_MODE must be " +
      '"supabase" or "server"). Refusing to start with the local demo auth, whose ' +
      "sessions are unverified localStorage state. Set VITE_AUTH_MODE=supabase " +
      "and the matching Supabase env vars before deploying.",
  );
}

// Same fail-closed rule when the mode is set to "supabase" but the required
// client-safe env vars are missing: don't start half-configured in production.
if (mode === "supabase" && !supabase && import.meta.env.PROD) {
  throw new Error(
    "[Wirby] VITE_AUTH_MODE=supabase but VITE_SUPABASE_URL / " +
      "VITE_SUPABASE_PUBLISHABLE_KEY are missing. Refusing to start in production " +
      "without a working auth backend.",
  );
}

export const authAdapter: AuthAdapter =
  mode === "supabase" ? supabaseAuthAdapter : mode === "server" ? httpAuthAdapter : localAuthAdapter;
