import { afterEach, describe, expect, it, vi } from "vitest";

// Real supabase-js on purpose: its createClient("") throws "supabaseUrl is required",
// which is exactly what broke `next build` on the LCA Vercel project (no Supabase env).
vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/clerk")).clerkServerModule);

const SUPABASE_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

// Modules on the build path that used to create a Supabase client at import time
// (books-utils / usage-tracking are patched too but no route imports them).
const MODULES = [
  "@/utils/db",
  "@/utils/supabase-genres",
  "@/app/api/chat/check-limit/route",
  "@/app/api/chat/usage/route",
  "@/app/api/pro/verify-key/route",
  "@/app/api/feedback/route",
  "@/app/api/ensure-user/route",
  "@/app/api/pro/status/route",
  "@/app/api/past-papers/route",
  "@/actions/actions",
];

describe("modules load without Supabase settings (next build 'Collecting page data')", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each(MODULES)("%s imports cleanly with no Supabase env", async (mod) => {
    for (const key of SUPABASE_ENV) vi.stubEnv(key, "");
    vi.resetModules();
    await expect(import(mod)).resolves.toBeDefined();
  });

  it("still fails loudly at first use when the settings are missing", async () => {
    for (const key of SUPABASE_ENV) vi.stubEnv(key, "");
    vi.resetModules();
    const { supabaseAdmin } = await import("@/utils/db");
    expect(() => supabaseAdmin.from("feedback")).toThrow("Missing Supabase environment variables");
  });
});
