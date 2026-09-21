import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerClerk, serverState } from "../helpers/clerk";
import { makeRequest, readJson } from "../helpers/request";
import { supabaseMock as sb } from "../helpers/supabase-mock";

vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/clerk")).clerkServerModule);
vi.mock("@supabase/supabase-js", async () => (await import("../helpers/supabase-mock")).supabaseModule);

const openai = vi.hoisted(() => ({ create: vi.fn(), ctorArgs: [] as any[] }));
vi.mock("openai", () => ({
  default: class FakeOpenAI {
    chat = { completions: { create: openai.create } };
    constructor(args: any) {
      openai.ctorArgs.push(args);
    }
  },
}));

const gemini = vi.hoisted(() => ({ generateContent: vi.fn(), apiKeys: [] as string[], models: [] as any[] }));
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    constructor(key: string) {
      gemini.apiKeys.push(key);
    }
    getGenerativeModel(opts: any) {
      gemini.models.push(opts);
      return { generateContent: gemini.generateContent };
    }
  },
}));

const checkLimit = await import("@/app/api/chat/check-limit/route");
const usage = await import("@/app/api/chat/usage/route");
const chat = await import("@/app/api/chat/route");

beforeEach(() => {
  sb.reset();
  resetServerClerk();
  serverState.userId = "user_clerk_1";
  sb.onQuery((q) => (q.table === "users" ? { data: { id: "sup-1" } } : { data: null }));
  openai.create.mockReset();
  openai.ctorArgs.length = 0;
  gemini.generateContent.mockReset();
  gemini.apiKeys.length = 0;
  gemini.models.length = 0;
});

describe("POST /api/chat/check-limit", () => {
  const call = async (body: unknown = { input_tokens: 100, output_tokens: 1500 }) =>
    readJson(await checkLimit.POST(makeRequest("/api/chat/check-limit", { method: "POST", body })));

  const usageRow = (input: number, output: number) => ({ tokens_input_used: input, tokens_output_used: output });

  it("returns 401 when signed out", async () => {
    serverState.userId = null;
    await expect(call()).resolves.toMatchObject({ status: 401, body: { message: "Unauthorized" } });
  });

  it("returns 401 when the Clerk user cannot be loaded", async () => {
    serverState.getUserError = new Error("clerk down");
    await expect(call()).resolves.toMatchObject({ status: 401, body: { message: "Authentication error" } });
  });

  it("returns 400 without an email and 404 without a Supabase user", async () => {
    serverState.email = null;
    await expect(call()).resolves.toMatchObject({ status: 400, body: { message: "Email not found" } });
    serverState.email = "student@example.com";
    sb.onQuery(() => ({ error: { message: "no rows" } }));
    await expect(call()).resolves.toMatchObject({ status: 404, body: { message: "User not found" } });
  });

  it("passes the requested token counts to check_usage_limit", async () => {
    sb.onRpc(() => ({ data: { success: true, can_proceed: true, is_pro: false } }));
    await call({ input_tokens: 42, output_tokens: 7 });
    expect(sb.rpc).toHaveBeenCalledWith("check_usage_limit", { p_user_id: "sup-1", p_input_tokens: 42, p_output_tokens: 7 });
  });

  it("allows requests well within the limit", async () => {
    sb.onRpc(() => ({ data: { success: true, can_proceed: true, is_pro: true, usage: usageRow(1000, 2000) } }));
    await expect(call()).resolves.toEqual({
      status: 200,
      body: { success: true, can_proceed: true, message: "Usage within limits", is_pro: true },
    });
  });

  it("returns 500 when the RPC errors", async () => {
    sb.onRpc(() => ({ error: { message: "db" } }));
    await expect(call()).resolves.toMatchObject({ status: 500, body: { message: "Failed to check usage limit" } });
  });

  it("blocks a free user at >=95% of the input allowance without downgrading anyone", async () => {
    sb.onRpc(() => ({ data: { success: true, can_proceed: true, is_pro: false, usage: usageRow(237_500, 0) } }));
    const res = await call();
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ can_proceed: false, is_pro: false, downgraded: false, usage: usageRow(237_500, 0) });
    expect(res.body.message).toMatch(/^Free plan token limit reached/);
    expect(sb.queries.filter((q) => q.op() !== "select")).toHaveLength(0);
  });

  it("blocks when this request would push usage over the limit", async () => {
    sb.onRpc(() => ({ data: { success: true, can_proceed: true, is_pro: false, usage: usageRow(0, 499_000) } }));
    const res = await call({ input_tokens: 10, output_tokens: 1500 });
    expect(res.status).toBe(429);
  });

  it("downgrades a Pro user at >=95% usage: deletes pro usage + keys and starts a fresh free period", async () => {
    sb.onRpc(() => ({ data: { success: true, can_proceed: true, is_pro: true, usage: usageRow(960_000, 0) } }));
    const res = await call();
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ is_pro: false, downgraded: true, usage: { tokens_input_used: 0, tokens_output_used: 0 } });
    expect(res.body.message).toMatch(/^Pro plan token limit reached/);

    const writes = sb.queries.filter((q) => q.op() !== "select").map((q) => `${q.op()} ${q.table}`);
    expect(writes).toEqual(["delete usage_pro", "delete keys", "upsert usage_free"]);
    expect(sb.queriesFor("keys")[0].has("eq", "used_by", "sup-1")).toBe(true);
    expect(sb.queriesFor("usage_free")[0].arg("upsert")).toMatchObject({ user_id: "sup-1", tokens_input_used: 0 });
  });

  it("blocks when the database says the user cannot proceed", async () => {
    sb.onRpc(() => ({ data: { success: false, can_proceed: false, is_pro: false, message: "Monthly limit hit" } }));
    await expect(call()).resolves.toMatchObject({ status: 429, body: { message: "Monthly limit hit", downgraded: false } });
  });

  it("returns 500 on a malformed JSON body", async () => {
    const res = await checkLimit.POST(makeRequest("/api/chat/check-limit", { method: "POST", body: "{not json" }));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/chat/usage", () => {
  const call = async (body: unknown = { input_tokens: 10, output_tokens: 20 }) =>
    readJson(await usage.POST(makeRequest("/api/chat/usage", { method: "POST", body })));

  it("returns 401 when signed out", async () => {
    serverState.userId = null;
    await expect(call()).resolves.toMatchObject({ status: 401 });
  });

  it("records usage through record_usage and returns it", async () => {
    sb.onRpc(() => ({ data: { success: true, is_pro: false, usage: { tokens_input_used: 10 } } }));
    await expect(call()).resolves.toEqual({
      status: 200,
      body: { success: true, usage: { tokens_input_used: 10 }, is_pro: false },
    });
    expect(sb.rpc).toHaveBeenCalledWith("record_usage", { p_user_id: "sup-1", p_input_tokens: 10, p_output_tokens: 20 });
  });

  it("maps 'limit exceeded' RPC errors to 429 and other errors to 500", async () => {
    sb.onRpc(() => ({ error: { message: "monthly limit exceeded" } }));
    await expect(call()).resolves.toMatchObject({ status: 429, body: { message: "Monthly token limit exceeded" } });
    sb.onRpc(() => ({ error: { message: "connection reset" } }));
    await expect(call()).resolves.toMatchObject({ status: 500, body: { message: "Usage tracking failed" } });
  });

  it("returns 429 when record_usage reports success=false", async () => {
    sb.onRpc(() => ({ data: { success: false, message: "Over quota", is_pro: false, downgraded: true } }));
    await expect(call()).resolves.toMatchObject({ status: 429, body: { message: "Over quota", downgraded: true } });
  });
});

describe("POST /api/chat (OpenAI streaming)", () => {
  const messages = [{ role: "user", content: "12345678" }];

  it("rejects unauthenticated and invalid requests before calling OpenAI", async () => {
    serverState.userId = null;
    await expect(readJson(await chat.POST(makeRequest("/api/chat", { method: "POST", body: { messages } })))).resolves.toMatchObject({ status: 401 });
    serverState.userId = "user_clerk_1";
    await expect(readJson(await chat.POST(makeRequest("/api/chat", { method: "POST", body: { messages: [] } })))).resolves.toMatchObject({
      status: 400,
      body: { error: "Invalid messages" },
    });
    expect(openai.create).not.toHaveBeenCalled();
  });

  it("returns 500 when OPENAI_API_KEY is not configured", async () => {
    const res = await readJson(await chat.POST(makeRequest("/api/chat", { method: "POST", body: { messages } })));
    expect(res).toMatchObject({ status: 500, body: { error: "OpenAI API key not configured" } });
  });

  it("streams the completion and records input then output tokens", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    sb.onRpc(() => ({ data: { success: true } }));
    openai.create.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: { content: "Hello" } }] };
        yield { choices: [{ delta: { content: " world" } }] };
        yield { choices: [{ delta: {} }] };
      })()
    );
    const res = await chat.POST(makeRequest("/api/chat", { method: "POST", body: { messages } }));
    expect(res.headers.get("content-type")).toBe("text/plain");
    await expect(res.text()).resolves.toBe("Hello world");
    expect(openai.ctorArgs[0]).toEqual({ apiKey: "sk-test" });
    expect(openai.create).toHaveBeenCalledWith(expect.objectContaining({ stream: true, messages: [{ role: "user", content: "12345678" }] }));
    expect(sb.rpc.mock.calls).toEqual([
      ["record_usage", { p_user_id: "sup-1", p_input_tokens: 2, p_output_tokens: 0 }],
      ["record_usage", { p_user_id: "sup-1", p_input_tokens: 0, p_output_tokens: 3 }],
    ]);
  });

  it("returns 429 without calling OpenAI when input usage is over the limit", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    sb.onRpc(() => ({ error: { message: "limit exceeded" } }));
    const res = await readJson(await chat.POST(makeRequest("/api/chat", { method: "POST", body: { messages } })));
    expect(res).toMatchObject({ status: 429, body: { error: "Monthly token limit exceeded" } });
    expect(openai.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/llm (Gemini)", () => {
  async function loadLlmRoute(key: string) {
    vi.stubEnv("GEMINI_API_KEY", key);
    vi.resetModules(); // API key is read at module load
    return import("@/app/api/llm/route");
  }

  it("returns 500 when no Gemini key is configured", async () => {
    const llm = await loadLlmRoute("");
    const res = await readJson(await llm.POST(makeRequest("/api/llm", { method: "POST", body: { prompt: "hi" } })));
    expect(res).toEqual({ status: 500, body: { error: "Missing GEMINI_API_KEY" } });
    expect(gemini.generateContent).not.toHaveBeenCalled();
  });

  it("sends the prompt (and optional inline image) and returns the text", async () => {
    const llm = await loadLlmRoute("gemini-test-key");
    gemini.generateContent.mockResolvedValue({ response: { text: () => "An answer" } });
    const body = { prompt: "Describe", image: { data: "BASE64", mimeType: "image/png" } };
    const res = await readJson(await llm.POST(makeRequest("/api/llm", { method: "POST", body })));
    expect(res).toEqual({ status: 200, body: { text: "An answer" } });
    expect(gemini.apiKeys).toEqual(["gemini-test-key"]);
    expect(gemini.generateContent).toHaveBeenCalledWith({
      contents: [{ role: "user", parts: [{ text: "Describe" }, { inlineData: { data: "BASE64", mimeType: "image/png" } }] }],
    });
  });

  it("returns 500 with the provider error message", async () => {
    const llm = await loadLlmRoute("gemini-test-key");
    gemini.generateContent.mockRejectedValue(new Error("quota exceeded"));
    const res = await readJson(await llm.POST(makeRequest("/api/llm", { method: "POST", body: { prompt: "x" } })));
    expect(res).toEqual({ status: 500, body: { error: "quota exceeded" } });
  });
});
