import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUser, resetServerClerk, serverState } from "../helpers/clerk";
import { makeRequest, readJson } from "../helpers/request";
import { supabaseMock as sb, type RecordedQuery } from "../helpers/supabase-mock";

vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/clerk")).clerkServerModule);
vi.mock("@supabase/supabase-js", async () => (await import("../helpers/supabase-mock")).supabaseModule);

const verifyKey = await import("@/app/api/pro/verify-key/route");
const status = await import("@/app/api/pro/status/route");

const NOW = new Date("2026-09-18T12:00:00Z");
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

beforeEach(() => {
  sb.reset();
  resetServerClerk();
  serverState.userId = "user_clerk_1";
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});

/** Route Supabase queries for the pro flows. */
function db({
  user = { id: "sup-1", email: "student@example.com" } as any,
  activeKey = null as any,
  keyRow = null as any,
}) {
  sb.onQuery((q: RecordedQuery) => {
    if (q.table === "users") return user ? { data: user } : { data: null, error: { message: "no rows" } };
    if (q.table === "keys" && q.calls.some((c) => c.method === "gt")) return { data: activeKey };
    if (q.table === "keys" && q.calls.some((c) => c.method === "lte")) return { data: null };
    if (q.table === "keys" && q.has("eq", "key")) return keyRow ? { data: keyRow } : { data: null };
    return { data: null };
  });
}

describe("POST /api/pro/verify-key", () => {
  const call = async (body: unknown = { key: "PRO-KEY-1" }) =>
    readJson(await verifyKey.POST(makeRequest("/api/pro/verify-key", { method: "POST", body })));

  const unusedKey = { id: "key-1", key: "PRO-KEY-1", is_used: false, expiry_date: daysFromNow(30), duration_days: 30 };

  it("returns 401 when signed out", async () => {
    serverState.userId = null;
    await expect(call()).resolves.toMatchObject({ status: 401, body: { message: "Unauthorized" } });
  });

  it("returns 400 when no key is supplied", async () => {
    db({});
    await expect(call({})).resolves.toMatchObject({ status: 400, body: { message: "Key is required" } });
  });

  it("retries Clerk twice, then returns 503 with retry=true", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    serverState.getUserError = new Error("clerk 502");
    const pending = verifyKey.POST(makeRequest("/api/pro/verify-key", { method: "POST", body: { key: "k" } }));
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    const res = await readJson(await pending);
    expect(res).toMatchObject({ status: 503, body: { retry: true } });
    expect(getUser).toHaveBeenCalledTimes(3);
  });

  it("returns 400 when the email has no Supabase user", async () => {
    db({ user: null });
    const res = await call();
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No matching Supabase user/);
  });

  it("rejects an unknown key", async () => {
    db({ keyRow: null });
    await expect(call()).resolves.toMatchObject({ status: 400, body: { success: false, message: "Invalid key" } });
    expect(sb.rpc).not.toHaveBeenCalledWith("activate_pro_key", expect.anything());
  });

  it("rejects a key that was already used", async () => {
    db({ keyRow: { ...unusedKey, is_used: true } });
    await expect(call()).resolves.toMatchObject({ status: 400, body: { message: "This key has already been used" } });
  });

  it("rejects an expired key", async () => {
    db({ keyRow: { ...unusedKey, expiry_date: daysFromNow(-1) } });
    await expect(call()).resolves.toMatchObject({ status: 400, body: { message: "This key has expired" } });
  });

  it("blocks activation while a Pro subscription is active (renewal disabled)", async () => {
    db({ activeKey: { expiry_date: daysFromNow(10) }, keyRow: unusedKey });
    sb.onRpc((name: string) => (name === "record_usage" ? { data: { is_pro: true } } : { data: null }));
    const res = await call();
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already have an active pro access/);
    expect(sb.rpc).not.toHaveBeenCalledWith("activate_pro_key", expect.anything());
  });

  it("activates a valid key and resets the free lifetime allowance", async () => {
    db({ keyRow: unusedKey });
    sb.onRpc((name: string) =>
      name === "activate_pro_key" ? { data: { success: true, expiry_date: daysFromNow(30), duration_days: 30 } } : { data: null }
    );
    const res = await call();
    expect(res).toEqual({
      status: 200,
      body: {
        success: true,
        message: "Pro access activated successfully!",
        isRenewal: false,
        expiryDate: daysFromNow(30),
        durationDays: 30,
      },
    });
    expect(sb.rpc).toHaveBeenCalledWith("activate_pro_key", { key_id: "key-1", user_identifier: "sup-1" });
    const reset = sb.queriesFor("free_lifetime_usage")[0];
    expect(reset.op()).toBe("upsert");
    expect(reset.arg("upsert")).toMatchObject({ user_id: "sup-1", eval_count: 0, mcq_count: 0 });
    expect(reset.arg("upsert", 1)).toEqual({ onConflict: "user_id" });
  });

  it("returns 400 with the DB message when activation is refused", async () => {
    db({ keyRow: unusedKey });
    sb.onRpc(() => ({ data: { success: false, message: "Key reserved" } }));
    await expect(call()).resolves.toMatchObject({ status: 400, body: { message: "Key reserved" } });
  });

  it("returns 500 when the activation transaction errors", async () => {
    db({ keyRow: unusedKey });
    sb.onRpc(() => ({ error: { message: "deadlock detected" } }));
    await expect(call()).resolves.toMatchObject({ status: 500, body: { message: "deadlock detected" } });
  });
});

describe("GET /api/pro/status", () => {
  const call = async () => readJson(await status.GET(makeRequest("/api/pro/status")));

  it("returns 401 when signed out", async () => {
    serverState.userId = null;
    await expect(call()).resolves.toMatchObject({ status: 401, body: { message: "Unauthorized" } });
  });

  it("returns 404 when there is no Supabase user", async () => {
    db({ user: null });
    await expect(call()).resolves.toMatchObject({ status: 404, body: { message: "No matching supabase user" } });
  });

  it("returns 500 when usage cannot be read", async () => {
    db({});
    sb.onRpc(() => ({ error: { message: "db" } }));
    await expect(call()).resolves.toMatchObject({ status: 500, body: { message: "Failed to retrieve usage data" } });
  });

  it("reports an active Pro user with days left and Pro limits", async () => {
    db({ activeKey: { expiry_date: daysFromNow(9.5), duration_days: 30 } });
    sb.onRpc(() => ({
      data: { is_pro: true, downgraded: false, usage: { tokens_input_used: 5, tokens_output_used: 6, period_start: "2026-09-01" } },
    }));
    await expect(call()).resolves.toEqual({
      status: 200,
      body: {
        success: true,
        hasAccess: true,
        isPro: true,
        downgraded: false,
        daysLeft: 10,
        end_date: daysFromNow(9.5),
        usage: { tokens_input: 5, tokens_output: 6, period_start: "2026-09-01" },
        limits: { input_tokens: 1_000_000, output_tokens: 3_000_000 },
      },
    });
    expect(sb.rpc).toHaveBeenCalledWith("record_usage", { p_user_id: "sup-1", p_input_tokens: 0, p_output_tokens: 0 });
  });

  it("reports a downgraded user as Free even if a key is still active", async () => {
    db({ activeKey: { expiry_date: daysFromNow(9) } });
    sb.onRpc(() => ({ data: { is_pro: true, downgraded: true, usage: null } }));
    const res = await call();
    expect(res.body).toMatchObject({ isPro: false, hasAccess: false, downgraded: true, usage: null });
    expect(res.body.limits).toEqual({ input_tokens: 250_000, output_tokens: 500_000 });
    expect(res.body.daysLeft).toBeUndefined();
  });

  it("reports a free user", async () => {
    db({});
    sb.onRpc(() => ({ data: { is_pro: false } }));
    await expect(call()).resolves.toMatchObject({ status: 200, body: { success: true, isPro: false, downgraded: false } });
  });

  it("returns 503 when Clerk returns a user without an email", async () => {
    serverState.email = null;
    await expect(call()).resolves.toMatchObject({ status: 503, body: { retry: true } });
  });

  it("returns 500 when Supabase env vars are missing at startup", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.resetModules(); // the route builds its client at module load
    const fresh = await import("@/app/api/pro/status/route");
    const res = await readJson(await fresh.GET(makeRequest("/api/pro/status")));
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/Supabase environment variables are missing/);
  });
});
