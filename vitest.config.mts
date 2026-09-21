import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vitest runs three projects:
 *   unit        - pure utils / store / API clients (node; files may opt into jsdom)
 *   api         - Next.js route handlers, server actions and middleware (node)
 *   components  - React components with Testing Library (jsdom)
 *
 * All external services (Clerk, Supabase, backend, Gemini, OpenAI) are mocked;
 * tests/setup/common.ts fails any test that lets a real fetch through.
 */

// Deterministic, fake configuration. Explicit empty strings override anything
// that might be exported in the developer's shell.
const testEnv = {
  TZ: "UTC",
  NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  NEXT_PUBLIC_API_BASE_URL: "http://backend.test",
  NEXT_PUBLIC_BACKEND_URL: "",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k",
  CLERK_SECRET_KEY: "test-fake-clerk-secret-key",
  GEMINI_API_KEY: "",
  NEXT_PUBLIC_API_KEY: "",
  OPENAI_API_KEY: "",
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    env: testEnv,
    clearMocks: true,
    reporters: ["default", ["junit", { outputFile: "test-results/vitest-junit.xml" }]],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/types/**", "src/db/**"],
      reporter: ["text", "text-summary", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      // Set just below the measured figures so coverage cannot silently regress.
      // Measured 2026-09-18: lines/statements 48.3%, branches 78.6%, functions 74.2%.
      thresholds: {
        lines: 48,
        statements: 48,
        branches: 78,
        functions: 74,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup/common.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "api",
          environment: "node",
          include: ["tests/api/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup/common.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["tests/components/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup/common.ts", "tests/setup/dom.ts"],
        },
      },
    ],
  },
});
