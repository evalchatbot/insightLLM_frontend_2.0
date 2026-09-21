import { afterEach, beforeEach, vi } from "vitest";
import { requestUrl, unmockedCalls } from "../helpers/fetch";

/**
 * Shared setup for every Vitest project.
 *
 * - Replaces global fetch with a guard: any request a test did not explicitly
 *   mock is recorded and fails the test, so nothing can reach Clerk, Supabase,
 *   Gemini, OpenAI or the Python backend.
 * - Silences the (very chatty) console output of the app code. Set
 *   TEST_VERBOSE=1 to see it while debugging.
 */
beforeEach(() => {
  unmockedCalls.length = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = `${(init?.method ?? "GET").toUpperCase()} ${requestUrl(input)}`;
    unmockedCalls.push(call);
    throw new Error(`[test] Unexpected network call: ${call}`);
  }) as unknown as typeof fetch;

  if (!process.env.TEST_VERBOSE) {
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation(() => undefined);
    }
  }
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  if (unmockedCalls.length > 0) {
    const calls = unmockedCalls.splice(0);
    throw new Error(`Test attempted unmocked network calls:\n  ${calls.join("\n  ")}`);
  }
});
