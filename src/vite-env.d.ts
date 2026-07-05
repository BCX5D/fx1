/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Auth/data backend selector:
   *  - "supabase": real Supabase Auth + Postgres (production path)
   *  - "server":   custom httpOnly-cookie backend adapter
   *  - unset/"local": offline demo (localStorage), dev only
   */
  readonly VITE_AUTH_MODE?: "local" | "server" | "supabase";
  /** Base path for the custom backend when VITE_AUTH_MODE="server". Defaults to "/api". */
  readonly VITE_API_BASE?: string;
  /** Supabase project URL (client-safe). Required when VITE_AUTH_MODE="supabase". */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable/anon key (client-safe; RLS enforces access). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Plausible analytics domain (e.g. "wirby.app"). Analytics load only when set. */
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  /**
   * Cloudflare Turnstile site key (client-safe). When set, sign-in, sign-up,
   * and forgot-password show a Turnstile challenge and pass the resulting
   * token to Supabase as `options.captchaToken`, which Supabase verifies
   * server-side against CAPTCHA protection enabled in the dashboard
   * (Authentication > Bot and Abuse Protection). Left unset, no widget is
   * shown and no token is sent -- this is an opt-in hardening step, not a
   * silent fail-open, since Supabase's own CAPTCHA enforcement (if turned on
   * in the dashboard) is what actually blocks unverified requests either way.
   */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
