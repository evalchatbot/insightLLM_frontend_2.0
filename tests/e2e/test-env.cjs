#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS script run directly by node */
/**
 * Fake, hermetic configuration for building and serving the app in E2E tests
 * (used identically by local runs and CI).
 *
 * Usage:  node tests/e2e/test-env.cjs build
 *         node tests/e2e/test-env.cjs start --port 3100
 *
 * Values here OVERRIDE the caller's environment and any .env.local, so a
 * developer's real keys can never leak into an E2E run.
 *
 * - Supabase and the Python backend point at 127.0.0.1:9 (nothing listens there),
 *   so server-side calls fail fast with ECONNREFUSED instead of reaching the internet.
 * - Clerk uses a syntactically valid but fake *live* key. A pk_test_ key would make
 *   the middleware perform a dev-browser handshake redirect to the fake Frontend API;
 *   with pk_live_ signed-out requests are handled locally. The browser tries to load
 *   clerk-js from https://clerk.example.com - Playwright aborts all non-local requests.
 */
const UNREACHABLE = "http://127.0.0.1:9";

const e2eEnv = {
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: UNREACHABLE,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "e2e-fake-service-role-key",
  NEXT_PUBLIC_API_BASE_URL: UNREACHABLE,
  NEXT_PUBLIC_BACKEND_URL: "",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
  // base64("clerk.example.com$")
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_Y2xlcmsuZXhhbXBsZS5jb20k",
  CLERK_SECRET_KEY: "e2e-fake-clerk-secret-key",
  GEMINI_API_KEY: "",
  NEXT_PUBLIC_API_KEY: "",
  OPENAI_API_KEY: "",
};

module.exports = { e2eEnv, UNREACHABLE };

if (require.main === module) {
  const { spawn } = require("node:child_process");
  const nextBin = require.resolve("next/dist/bin/next");
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: node tests/e2e/test-env.cjs <next command> [...args]");
    process.exit(2);
  }
  const child = spawn(process.execPath, [nextBin, ...args], {
    stdio: "inherit",
    env: { ...process.env, ...e2eEnv },
  });
  const forward = (signal) => () => child.kill(signal);
  process.on("SIGINT", forward("SIGINT"));
  process.on("SIGTERM", forward("SIGTERM"));
  child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 1));
}
