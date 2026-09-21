import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCalls, mockFetch } from "../helpers/fetch";
import { makeRequest, readJson } from "../helpers/request";
import { createClientSpy, supabaseMock as sb } from "../helpers/supabase-mock";

vi.mock("@supabase/supabase-js", async () => (await import("../helpers/supabase-mock")).supabaseModule);

const genres = await import("@/app/api/genres/route");
const mcqs = await import("@/app/quiz/mcqs/route");
const pastPapers = await import("@/app/api/past-papers/route");
const feedback = await import("@/app/api/feedback/route");

beforeEach(() => {
  sb.reset();
});

describe("GET /api/genres", () => {
  it("proxies the backend when it returns an array (no Supabase call)", async () => {
    const spy = mockFetch([{ url: "http://backend.test/quiz/genres", respond: { json: [{ id: "g1", name: "History" }] } }]);
    const res = await readJson(await genres.GET());
    expect(res).toEqual({ status: 200, body: [{ id: "g1", name: "History" }] });
    expect(spy.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("strips a trailing slash from the backend URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://backend.test/");
    const spy = mockFetch([{ url: "http://backend.test/quiz/genres", respond: { json: [] } }]);
    await genres.GET();
    expect(fetchCalls(spy)).toEqual(["GET http://backend.test/quiz/genres"]);
  });

  it.each([
    ["backend is unreachable", { networkError: true }],
    ["backend returns 500", { status: 500, json: { detail: "boom" } }],
    ["backend returns a non-array", { json: { genres: [] } }],
  ])("falls back to Supabase when the %s", async (_label, backend) => {
    mockFetch([{ url: "http://backend.test/quiz/genres", respond: backend }]);
    sb.onQuery(() => ({ data: [{ id: "g2", name: "Economy" }] }));
    const res = await readJson(await genres.GET());
    expect(res).toEqual({ status: 200, body: [{ id: "g2", name: "Economy" }] });
    const q = sb.queriesFor("genres")[0];
    expect(q.has("order", "name", { ascending: true })).toBe(true);
  });

  it("uses NEXT_PUBLIC_BACKEND_URL when NEXT_PUBLIC_API_BASE_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://alt-backend.test");
    mockFetch([{ url: "http://alt-backend.test/quiz/genres", respond: { json: [{ id: "x" }] } }]);
    await expect(readJson(await genres.GET())).resolves.toEqual({ status: 200, body: [{ id: "x" }] });
  });

  it("queries Supabase directly (preferring the service key) when no backend is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    sb.onQuery(() => ({ data: [] }));
    await expect(readJson(await genres.GET())).resolves.toEqual({ status: 200, body: [] });
    expect(createClientSpy).toHaveBeenLastCalledWith("http://supabase.test", "test-service-role-key");
  });

  it("returns 500 JSON when Supabase fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    sb.onQuery(() => ({ error: { message: "relation genres does not exist" } }));
    await expect(readJson(await genres.GET())).resolves.toEqual({
      status: 500,
      body: { error: "relation genres does not exist" },
    });
  });

  it("returns 500 when neither backend nor Supabase is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await expect(readJson(await genres.GET())).resolves.toEqual({ status: 500, body: { error: "Supabase credentials not set" } });
  });
});

describe("GET /quiz/mcqs", () => {
  const get = (query = "") => mcqs.GET(new Request(`http://localhost:3000/quiz/mcqs${query}`));
  const row = (i: number) => ({ id: `m${i}`, question: `Q${i}`, option_a: "a", option_b: "b", option_c: "c", option_d: "d", correct_answer: "a" });

  it("proxies the backend with genre, limit and random, trimming to the limit", async () => {
    const spy = mockFetch([{ url: /\/quiz\/mcqs\?/, respond: { json: [row(1), row(2), row(3)] } }]);
    const res = await readJson(await get("?genre_id=history&limit=2&random=true"));
    expect(res).toEqual({ status: 200, body: [row(1), row(2)] });
    expect(fetchCalls(spy)).toEqual(["GET http://backend.test/quiz/mcqs?genre_id=history&limit=2&random=true"]);
  });

  it("defaults to genre 'general', limit 20, random=false", async () => {
    const spy = mockFetch([{ url: /\/quiz\/mcqs\?/, respond: { json: [] } }]);
    await get();
    expect(fetchCalls(spy)[0]).toBe("GET http://backend.test/quiz/mcqs?genre_id=general&limit=20&random=false");
  });

  it("returns [] when the backend answers with a non-array (e.g. an error object)", async () => {
    mockFetch([{ url: /\/quiz\/mcqs\?/, respond: { status: 500, json: { detail: "db down" } } }]);
    await expect(readJson(await get())).resolves.toEqual({ status: 200, body: [] });
  });

  it("returns 500 JSON when the backend is unreachable", async () => {
    mockFetch([{ url: /\/quiz\/mcqs\?/, respond: { networkError: true } }]);
    const res = await readJson(await get());
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch");
  });

  it("useLocal=true skips the backend and reads Supabase", async () => {
    sb.onQuery(() => ({ data: [row(1), row(2), row(3)] }));
    const res = await readJson(await get("?useLocal=1&genre_id=law&limit=2"));
    expect(res.body).toEqual([row(1), row(2)]);
    expect(sb.queriesFor("mcqs")[0].has("eq", "genre_id", "law")).toBe(true);
  });

  it("shuffles Supabase rows when random=true", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.spyOn(Math, "random").mockReturnValue(0); // deterministic Fisher-Yates
    sb.onQuery(() => ({ data: [row(1), row(2), row(3)] }));
    const res = await readJson(await get("?random=true&limit=3"));
    expect(res.body.map((r: any) => r.id)).toEqual(["m2", "m3", "m1"]);
  });

  it("returns 500 when Supabase errors", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    sb.onQuery(() => ({ error: { message: "permission denied" } }));
    await expect(readJson(await get())).resolves.toEqual({ status: 500, body: { error: "permission denied" } });
  });

  it("serves the built-in sample MCQs when no backend or Supabase is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const res = await readJson(await get("?genre_id=unknown-genre&limit=5"));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    for (const q of res.body) {
      expect(q.genre_id).toBe("general");
      expect(q.question).toMatch(/^Sample general question #\d+$/);
      expect(q.correct_answer).toBe(q.option_a);
    }
    const all = await readJson(await get("?limit=100"));
    expect(all.body).toHaveLength(24);
  });
});

describe("GET /api/past-papers", () => {
  const get = (query: string) => pastPapers.GET(new Request(`http://localhost:3000/api/past-papers${query}`));

  it.each(["", "?exam=", "?exam=FPSC"])("rejects a missing or unknown exam (%s)", async (query) => {
    await expect(readJson(await get(query))).resolves.toEqual({ status: 400, body: { success: false, message: "exam must be CSS or PMS." } });
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("accepts a lower-case exam and groups questions under their subjects", async () => {
    const subjects = [
      { id: "s1", exam_type: "PMS", name: "Economics", slug: "economics", subject_group: "optional" },
      { id: "s2", exam_type: "PMS", name: "English Essay", slug: "essay", subject_group: "compulsory" },
    ];
    const q = (id: string, subject_id: string) => ({ id, subject_id, exam_type: "PMS", year: 2024 });
    sb.onQuery((query) =>
      query.table === "past_paper_subjects" ? { data: subjects } : { data: [q("q1", "s1"), q("q2", "s1"), q("q3", "s2")] }
    );
    const res = await readJson(await get("?exam=pms"));
    expect(res.status).toBe(200);
    expect(res.body.subjects).toEqual([
      { ...subjects[0], past_paper_questions: [q("q1", "s1"), q("q2", "s1")] },
      { ...subjects[1], past_paper_questions: [q("q3", "s2")] },
    ]);
    const [subjectQuery, questionQuery] = sb.queries;
    expect(subjectQuery.has("eq", "exam_type", "PMS")).toBe(true);
    expect(questionQuery.has("in", "subject_id", ["s1", "s2"])).toBe(true);
    expect(questionQuery.has("order", "year", { ascending: false })).toBe(true);
  });

  it("skips the question query when there are no subjects", async () => {
    sb.onQuery(() => ({ data: [] }));
    await expect(readJson(await get("?exam=CSS"))).resolves.toEqual({ status: 200, body: { success: true, subjects: [] } });
    expect(sb.queriesFor("past_paper_questions")).toHaveLength(0);
  });

  it("returns 500 when subjects or questions fail to load", async () => {
    sb.onQuery(() => ({ error: { message: "db" } }));
    await expect(readJson(await get("?exam=CSS"))).resolves.toMatchObject({ status: 500, body: { message: "Unable to load past paper subjects." } });
    sb.onQuery((query) => (query.table === "past_paper_subjects" ? { data: [{ id: "s1" }] } : { error: { message: "db" } }));
    await expect(readJson(await get("?exam=CSS"))).resolves.toMatchObject({ status: 500, body: { message: "Unable to load past paper questions." } });
  });

  it("returns 500 when Supabase is not configured at startup", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.resetModules();
    const fresh = await import("@/app/api/past-papers/route");
    const res = await readJson(await fresh.GET(new Request("http://localhost:3000/api/past-papers?exam=CSS")));
    expect(res).toEqual({ status: 500, body: { success: false, message: "Supabase is not configured." } });
  });
});

describe("/api/feedback", () => {
  const valid = {
    user_id: "user_1",
    user_email: "s@example.com",
    page_url: "homepage",
    feedback_type: "general",
    subject: "  Nice app  ",
    message: "  Loved the essay feedback  ",
    rating: 5,
    user_agent: "vitest",
  };
  const post = async (body: unknown) => readJson(await feedback.POST(makeRequest("/api/feedback", { method: "POST", body })));

  it.each(["page_url", "feedback_type", "subject", "message"])("rejects a submission without %s", async (field) => {
    const body: any = { ...valid };
    delete body[field];
    await expect(post(body)).resolves.toEqual({ status: 400, body: { error: "Missing required fields" } });
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("rejects an unknown feedback type", async () => {
    await expect(post({ ...valid, feedback_type: "spam" })).resolves.toEqual({ status: 400, body: { error: "Invalid feedback type" } });
  });

  it.each([0, 6, -1])("rejects rating %s", async (rating) => {
    await expect(post({ ...valid, rating })).resolves.toEqual({ status: 400, body: { error: "Rating must be between 1 and 5" } });
  });

  it("stores trimmed feedback as pending and returns 201", async () => {
    sb.onQuery(() => ({ data: { id: "fb-1" } }));
    const res = await post(valid);
    expect(res).toEqual({ status: 201, body: { success: true, message: "Feedback submitted successfully", data: { id: "fb-1" } } });
    expect(sb.queriesFor("feedback")[0].arg("insert")).toEqual([
      {
        user_id: "user_1",
        user_email: "s@example.com",
        page_url: "homepage",
        feedback_type: "general",
        subject: "Nice app",
        message: "Loved the essay feedback",
        rating: 5,
        user_agent: "vitest",
        status: "pending",
      },
    ]);
  });

  it("stores anonymous feedback with null identity fields", async () => {
    sb.onQuery(() => ({ data: {} }));
    await post({ page_url: "ocr", feedback_type: "bug", subject: "s", message: "m" });
    expect(sb.queriesFor("feedback")[0].arg("insert")[0]).toMatchObject({ user_id: null, user_email: null, rating: null, user_agent: null });
  });

  it("returns 500 with details when the insert fails", async () => {
    sb.onQuery(() => ({ error: { message: "RLS violation" } }));
    await expect(post(valid)).resolves.toEqual({ status: 500, body: { error: "Failed to save feedback", details: "RLS violation" } });
  });

  it("returns 500 for a malformed body", async () => {
    const res = await feedback.POST(makeRequest("/api/feedback", { method: "POST", body: "{oops" }));
    expect(res.status).toBe(500);
  });

  it("GET requires user_id and returns that user's feedback newest first", async () => {
    await expect(readJson(await feedback.GET(makeRequest("/api/feedback")))).resolves.toEqual({
      status: 400,
      body: { error: "User ID is required" },
    });
    sb.onQuery(() => ({ data: [{ id: "fb-2" }] }));
    await expect(readJson(await feedback.GET(makeRequest("/api/feedback?user_id=user_1")))).resolves.toEqual({
      status: 200,
      body: { success: true, data: [{ id: "fb-2" }] },
    });
    const q = sb.queriesFor("feedback")[0];
    expect(q.has("eq", "user_id", "user_1")).toBe(true);
    expect(q.has("order", "created_at", { ascending: false })).toBe(true);
  });

  it("GET returns 500 when the query fails", async () => {
    sb.onQuery(() => ({ error: { message: "db" } }));
    await expect(readJson(await feedback.GET(makeRequest("/api/feedback?user_id=u")))).resolves.toEqual({
      status: 500,
      body: { error: "Failed to fetch feedback" },
    });
  });
});
