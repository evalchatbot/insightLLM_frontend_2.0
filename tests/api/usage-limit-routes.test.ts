import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUser, resetServerClerk, serverState } from "../helpers/clerk";
import { makeRequest, readJson } from "../helpers/request";
import { createClientSpy, supabaseMock as sb } from "../helpers/supabase-mock";

vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/clerk")).clerkServerModule);
vi.mock("@supabase/supabase-js", async () => (await import("../helpers/supabase-mock")).supabaseModule);

const ocrCheck = await import("@/app/api/ocr/check-limit/route");
const ocrRecord = await import("@/app/api/ocr/record-usage/route");
const quizCheck = await import("@/app/api/quiz/check-limit/route");
const quizRecord = await import("@/app/api/quiz/record-attempt/route");

beforeEach(() => {
  sb.reset();
  resetServerClerk();
  serverState.userId = "user_clerk_1";
  sb.onQuery((q) => (q.table === "users" ? { data: { id: "sup-1" } } : { data: null }));
});

const routes = [
  { name: "POST /api/ocr/check-limit", handler: ocrCheck.POST, path: "/api/ocr/check-limit", rpc: "check_ocr_limit" },
  { name: "POST /api/ocr/record-usage", handler: ocrRecord.POST, path: "/api/ocr/record-usage", rpc: "record_ocr_usage" },
  { name: "POST /api/quiz/check-limit", handler: quizCheck.POST, path: "/api/quiz/check-limit", rpc: "check_mcq_limit" },
  { name: "POST /api/quiz/record-attempt", handler: quizRecord.POST, path: "/api/quiz/record-attempt", rpc: "record_mcq_attempt" },
];

describe.each(routes)("$name shared guards", ({ handler, path, rpc }) => {
  const call = async () => readJson(await handler(makeRequest(path, { method: "POST" })));

  it("returns 401 when signed out and never touches Supabase", async () => {
    serverState.userId = null;
    await expect(call()).resolves.toMatchObject({ status: 401, body: { success: false, message: "Unauthorized" } });
    expect(sb.from).not.toHaveBeenCalled();
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it("returns 500 when Supabase env vars are missing", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await expect(call()).resolves.toMatchObject({ status: 500, body: { message: "Server configuration error" } });
  });

  it("uses the service-role client", async () => {
    sb.onRpc(() => ({ data: { can_proceed: true } }));
    await call();
    expect(createClientSpy).toHaveBeenCalledWith("http://supabase.test", "test-service-role-key", expect.anything());
  });

  it("returns 400 when the Clerk user has no email", async () => {
    serverState.email = null;
    await expect(call()).resolves.toMatchObject({ status: 400, body: { message: "Email not found" } });
  });

  it("returns 500 (not a crash) when Clerk is unavailable", async () => {
    serverState.getUserError = new Error("clerk down");
    await expect(call()).resolves.toMatchObject({ status: 500, body: { success: false, message: "clerk down" } });
  });

  it("returns 404 when no Supabase user matches the email", async () => {
    sb.onQuery(() => ({ data: null, error: { code: "PGRST116", message: "no rows" } }));
    await expect(call()).resolves.toMatchObject({ status: 404, body: { message: "User not found" } });
    expect(sb.queriesFor("users")[0].has("eq", "email", "student@example.com")).toBe(true);
    expect(getUser).toHaveBeenCalledWith("user_clerk_1");
  });

  it(`calls ${rpc} with the Supabase user id`, async () => {
    sb.onRpc(() => ({ data: { can_proceed: true } }));
    await call();
    expect(sb.rpc).toHaveBeenCalledWith(rpc, { p_user_id: "sup-1" });
  });

  it("returns 500 when the RPC fails", async () => {
    sb.onRpc(() => ({ error: { message: "rpc exploded" } }));
    const res = await call();
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/ocr/check-limit", () => {
  const call = async () => readJson(await ocrCheck.POST(makeRequest("/api/ocr/check-limit", { method: "POST" })));

  it("allows a user under the limit", async () => {
    sb.onRpc(() => ({ data: { can_proceed: true, message: "OK", is_pro: false, ocr_count: 0, ocr_limit: 1 } }));
    await expect(call()).resolves.toEqual({
      status: 200,
      body: { success: true, can_proceed: true, message: "OK", is_pro: false, ocr_count: 0, ocr_limit: 1 },
    });
  });

  it("returns 429 with counts when the limit is reached", async () => {
    sb.onRpc(() => ({ data: { can_proceed: false, message: "Free evaluation used", is_pro: false, ocr_count: 1, ocr_limit: 1 } }));
    await expect(call()).resolves.toEqual({
      status: 429,
      body: { success: false, can_proceed: false, message: "Free evaluation used", is_pro: false, ocr_count: 1, ocr_limit: 1 },
    });
  });
});

describe("POST /api/ocr/record-usage", () => {
  it("returns the updated counters", async () => {
    sb.onRpc(() => ({ data: { message: "recorded", is_pro: true, ocr_count: 5, ocr_limit: 100 } }));
    const res = await readJson(await ocrRecord.POST(makeRequest("/api/ocr/record-usage", { method: "POST" })));
    expect(res).toEqual({
      status: 200,
      body: { success: true, message: "recorded", is_pro: true, ocr_count: 5, ocr_limit: 100 },
    });
  });

  it("reports 'Usage tracking failed' when the RPC errors", async () => {
    sb.onRpc(() => ({ error: { message: "db" } }));
    const res = await readJson(await ocrRecord.POST(makeRequest("/api/ocr/record-usage", { method: "POST" })));
    expect(res.body.message).toBe("Usage tracking failed");
  });
});

describe("POST /api/quiz/check-limit", () => {
  const call = async () => readJson(await quizCheck.POST(makeRequest("/api/quiz/check-limit", { method: "POST" })));

  it("allows a Pro user", async () => {
    sb.onRpc(() => ({ data: { can_proceed: true, message: "Pro", is_pro: true, mcq_count: 9, mcq_limit: null } }));
    await expect(call()).resolves.toEqual({
      status: 200,
      body: { success: true, can_proceed: true, message: "Pro", is_pro: true, mcq_count: 9, mcq_limit: null },
    });
  });

  it("blocks a free user who used their test", async () => {
    sb.onRpc(() => ({ data: { can_proceed: false, message: "Free MCQ test used", is_pro: false, mcq_count: 1, mcq_limit: 1 } }));
    await expect(call()).resolves.toMatchObject({ status: 429, body: { can_proceed: false, message: "Free MCQ test used" } });
  });

  it("fails closed (429) when the RPC returns no data", async () => {
    sb.onRpc(() => ({ data: null }));
    await expect(call()).resolves.toMatchObject({ status: 429, body: { can_proceed: false } });
  });
});

describe("POST /api/quiz/record-attempt", () => {
  it("returns the updated MCQ counters", async () => {
    sb.onRpc(() => ({ data: { is_pro: false, mcq_count: 1, mcq_limit: 1 } }));
    const res = await readJson(await quizRecord.POST(makeRequest("/api/quiz/record-attempt", { method: "POST" })));
    expect(res).toEqual({ status: 200, body: { success: true, is_pro: false, mcq_count: 1, mcq_limit: 1 } });
  });

  it("returns 500 when recording fails", async () => {
    sb.onRpc(() => ({ error: { message: "db" } }));
    const res = await readJson(await quizRecord.POST(makeRequest("/api/quiz/record-attempt", { method: "POST" })));
    expect(res).toEqual({ status: 500, body: { success: false, message: "Failed to record MCQ attempt" } });
  });
});
