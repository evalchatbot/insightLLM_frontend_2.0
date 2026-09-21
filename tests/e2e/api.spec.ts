import { expect, test } from "./fixtures";

/**
 * Public API routes against the real server with no backend and no reachable
 * Supabase: they must answer with JSON errors, never hang or crash.
 */
test.describe("Public API routes without a backend", () => {
  test("pro status requires authentication (Clerk middleware + getAuth)", async ({ request }) => {
    const response = await request.get("/api/pro/status");
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ success: false, message: "Unauthorized" });
  });

  for (const path of ["/api/ocr/check-limit", "/api/quiz/check-limit", "/api/chat/check-limit", "/api/ensure-user"]) {
    test(`POST ${path} rejects signed-out callers with 401`, async ({ request }) => {
      const response = await request.post(path, { data: {} });
      expect(response.status()).toBe(401);
    });
  }

  test("feedback validates input before touching the database", async ({ request }) => {
    const response = await request.post("/api/feedback", { data: { message: "hi" } });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing required fields" });
  });

  test("past papers validates the exam parameter", async ({ request }) => {
    const response = await request.get("/api/past-papers?exam=FPSC");
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ success: false, message: "exam must be CSS or PMS." });
  });

  test("genres falls back from the backend to Supabase and fails with a JSON 500", async ({ request }) => {
    const response = await request.get("/api/genres");
    expect(response.status()).toBe(500);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(typeof (await response.json()).error).toBe("string");
  });

  test("the LLM route reports a missing Gemini key", async ({ request }) => {
    const response = await request.post("/api/llm", { data: { prompt: "hello" } });
    expect(response.status()).toBe(500);
    expect(await response.json()).toEqual({ error: "Missing GEMINI_API_KEY" });
  });
});
