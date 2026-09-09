/**
 * Hardcoded single-login auth for the standalone Eval + Factbook app.
 *
 * This app intentionally has NO real authentication provider (no Clerk, no
 * Supabase auth). Access is gated by one shared username/password defined via
 * environment variables, with safe defaults so the app runs out of the box.
 *
 * Override in `.env.local`:
 *   APP_USERNAME=your-user
 *   APP_PASSWORD=your-strong-password
 *   APP_SESSION_TOKEN=some-long-random-string
 *
 * NOTE: keep these values OUT of any NEXT_PUBLIC_* variable so they are never
 * shipped to the browser. Only this server-side module reads them.
 */

/** Name of the httpOnly session cookie set after a successful login. */
export const AUTH_COOKIE = "ef_session";

/** Configured username (defaults to "admin"). */
export function getUsername(): string {
  return process.env.APP_USERNAME || "admin";
}

/** Configured password (defaults to "changeme"). */
export function getPassword(): string {
  return process.env.APP_PASSWORD || "changeme";
}

/**
 * Opaque session token stored in the cookie and compared by the middleware.
 * Uses a configurable secret so the cookie value can't be trivially guessed.
 */
export function getSessionToken(): string {
  return process.env.APP_SESSION_TOKEN || "eval-factbook-session-token";
}

/** Constant-time-ish credential check for the single shared login. */
export function checkCredentials(username: string, password: string): boolean {
  return username === getUsername() && password === getPassword();
}

/** Validate a cookie value against the expected session token. */
export function isValidSession(cookieValue: string | undefined | null): boolean {
  return !!cookieValue && cookieValue === getSessionToken();
}
