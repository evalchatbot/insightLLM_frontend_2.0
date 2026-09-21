// @vitest-environment jsdom
// ocr-api.ts is client code ("use client") that touches window/localStorage on downgrade.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCalls, mockFetch, type ResponseSpec } from "../helpers/fetch";
import * as ocr from "@/utils/ocr-api";

const BACKEND = "http://backend.test"; // NEXT_PUBLIC_API_BASE_URL in vitest.config.mts

const pdfFile = () => new File(["%PDF-1.4 test"], "answer.pdf", { type: "application/pdf" });
const allowLimit: ResponseSpec = { json: { success: true, can_proceed: true } };
const recorded: ResponseSpec = { json: { success: true, is_pro: false, ocr_count: 1, ocr_limit: 1 } };

function formFields(init: RequestInit | undefined): Record<string, unknown> {
  const body = init?.body as FormData;
  const out: Record<string, unknown> = {};
  body.forEach((value, key) => {
    out[key] = value instanceof File ? `file:${value.name}` : value;
  });
  return out;
}

describe("normalizeApiUrl / backend base URL", () => {
  afterEach(() => {
    vi.resetModules();
  });

  async function progressUrlFor(envValue: string) {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", envValue);
    vi.resetModules();
    const fresh = await import("@/utils/ocr-api");
    const spy = mockFetch([{ url: /\/api\/ocr\/progress\/r1$/, respond: { json: { progress_percent: 1 } } }]);
    await fresh.getProgress("r1");
    return fetchCalls(spy)[0];
  }

  it("repairs a malformed 'http:host' base URL", async () => {
    expect(await progressUrlFor("http:localhost:8001")).toBe("GET http://localhost:8001/api/ocr/progress/r1");
  });

  it("leaves well-formed http and https URLs untouched", async () => {
    expect(await progressUrlFor("https://api.rubric.test")).toBe("GET https://api.rubric.test/api/ocr/progress/r1");
    expect(await progressUrlFor("http://127.0.0.1:9000")).toBe("GET http://127.0.0.1:9000/api/ocr/progress/r1");
  });

  it("falls back to http://localhost:8000 when the env var is empty", async () => {
    expect(await progressUrlFor("")).toBe("GET http://localhost:8000/api/ocr/progress/r1");
  });
});

/**
 * annotateDocument, analyzeDocument and submitOCRJob share the same
 * "check limit -> record usage -> call backend" gate.
 */
const gated = [
  {
    name: "submitOCRJob",
    call: (file: File) => ocr.submitOCRJob(file, "user_1", "IR"),
    backend: `${BACKEND}/api/ocr/submit`,
    success: { json: { job_id: "job-1", request_id: "req-1" } },
  },
  {
    name: "annotateDocument",
    call: (file: File) => ocr.annotateDocument(file, "user_1", "IR"),
    backend: `${BACKEND}/api/ocr/annotate`,
    success: { json: { pdf_base64: btoa("%PDF"), metadata: null } },
  },
  {
    name: "analyzeDocument",
    call: (file: File) => ocr.analyzeDocument(file, "IR"),
    backend: `${BACKEND}/api/ocr/annotate/json`,
    success: { json: { detected_question: "Q" } },
  },
] as const;

describe.each(gated)("$name usage-limit gate", ({ call, backend, success }) => {
  it("stops with the server message when the limit check returns 429", async () => {
    const spy = mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: { status: 429, json: { message: "OCR limit reached for Free plan" } } },
    ]);
    await expect(call(pdfFile())).rejects.toThrow("OCR limit reached for Free plan");
    expect(fetchCalls(spy)).toEqual(["POST /api/ocr/check-limit"]);
  });

  it("asks the UI to refresh pro status when the 429 says the user was downgraded", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: { status: 429, json: { message: "limit reached", downgraded: true } } },
    ]);
    const listener = vi.fn();
    window.addEventListener("refreshProStatus", listener);
    await expect(call(pdfFile())).rejects.toThrow("limit reached");
    window.removeEventListener("refreshProStatus", listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("proStatusRefresh")).toMatch(/^\d+$/);
  });

  it("blocks the request when the limit endpoint errors", async () => {
    const spy = mockFetch([{ method: "POST", url: "/api/ocr/check-limit", respond: { status: 500, text: "boom" } }]);
    await expect(call(pdfFile())).rejects.toThrow(/Unable to verify/);
    expect(fetchCalls(spy)).toHaveLength(1);
  });

  it("blocks the request when the limit endpoint is unreachable", async () => {
    mockFetch([{ method: "POST", url: "/api/ocr/check-limit", respond: { networkError: true } }]);
    await expect(call(pdfFile())).rejects.toThrow("Unable to verify OCR usage limits. Please try again or contact support.");
  });

  it("does not call the backend when recording usage fails", async () => {
    const spy = mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: { status: 500, json: {} } },
    ]);
    await expect(call(pdfFile())).rejects.toThrow("Failed to record OCR usage. Please try again.");
    expect(fetchCalls(spy)).toEqual(["POST /api/ocr/check-limit", "POST /api/ocr/record-usage"]);
  });

  it("checks the limit, records usage, then calls the backend - in that order", async () => {
    const spy = mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
      { method: "POST", url: backend, respond: success },
    ]);
    await call(pdfFile());
    expect(fetchCalls(spy)).toEqual(["POST /api/ocr/check-limit", "POST /api/ocr/record-usage", `POST ${backend}`]);
  });

  it("refreshes pro status when record-usage reports an auto-downgrade", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: { json: { was_pro: true, is_pro: false } } },
      { method: "POST", url: backend, respond: success },
    ]);
    const listener = vi.fn();
    window.addEventListener("refreshProStatus", listener);
    await call(pdfFile());
    window.removeEventListener("refreshProStatus", listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("surfaces the backend 'detail' on HTTP errors", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
      { method: "POST", url: backend, respond: { status: 422, json: { detail: "Unsupported subject" } } },
    ]);
    await expect(call(pdfFile())).rejects.toThrow("Unsupported subject");
  });

  it("falls back to 'HTTP <status>' when the backend error has no JSON body", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
      { method: "POST", url: backend, respond: { status: 503, text: "<html>down</html>" } },
    ]);
    await expect(call(pdfFile())).rejects.toThrow(/^HTTP 503/);
  });
});

describe("submitOCRJob", () => {
  it("validates user and subject before any request", async () => {
    await expect(ocr.submitOCRJob(pdfFile(), "", "IR")).rejects.toThrow("User ID is required");
    await expect(ocr.submitOCRJob(pdfFile(), "user_1", "   ")).rejects.toThrow("Subject selection is required");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("uploads file, user and subject as multipart form data and returns the job ids", async () => {
    const spy = mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
      { method: "POST", url: `${BACKEND}/api/ocr/submit`, respond: { json: { job_id: "job-9", request_id: "req-9" } } },
    ]);
    await expect(ocr.submitOCRJob(pdfFile(), "user_1", "IR")).resolves.toEqual({ jobId: "job-9", requestId: "req-9" });
    expect(formFields(spy.mock.calls[2][1])).toEqual({ file: "file:answer.pdf", user_id: "user_1", subject: "IR" });
  });

  it("keeps the server's limit message when check-limit answers 200 with can_proceed=false", async () => {
    mockFetch([
      {
        method: "POST",
        url: "/api/ocr/check-limit",
        respond: { json: { can_proceed: false, message: "You have used your free evaluation. Upgrade to Pro for unlimited evaluations." } },
      },
    ]);
    await expect(ocr.submitOCRJob(pdfFile(), "user_1", "IR")).rejects.toThrow("You have used your free evaluation");
  });

  it("uses the backend 'error' field when there is no 'detail'", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
      { method: "POST", url: `${BACKEND}/api/ocr/submit`, respond: { status: 400, json: { error: "Too many pages" } } },
    ]);
    await expect(ocr.submitOCRJob(pdfFile(), "user_1", "IR")).rejects.toThrow("Too many pages");
  });
});

describe("annotateDocument / analyzeDocument", () => {
  it("annotateDocument validates inputs", async () => {
    await expect(ocr.annotateDocument(pdfFile(), "", "IR")).rejects.toThrow("User ID is required");
    await expect(ocr.annotateDocument(pdfFile(), "u", "")).rejects.toThrow("Subject selection is required");
    await expect(ocr.analyzeDocument(pdfFile(), " ")).rejects.toThrow("Subject selection is required");
  });

  it("annotateDocument decodes the base64 PDF and fills default metadata", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
      { method: "POST", url: `${BACKEND}/api/ocr/annotate`, respond: { json: { pdf_base64: btoa("%PDF-1.7 hi") } } },
    ]);
    const { pdfBlob, metadata } = await ocr.annotateDocument(pdfFile(), "user_1", "Sociology");
    expect(pdfBlob.type).toBe("application/pdf");
    expect(pdfBlob.size).toBe("%PDF-1.7 hi".length);
    expect(metadata.score).toEqual({ total_score: null, max_score: 20, dimensions: [] });
    expect(metadata.metadata.subject).toBe("Sociology");
  });

  it("analyzeDocument returns the backend JSON untouched", async () => {
    const result = { detected_question: "Q1", strengths: ["a"] };
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
      { method: "POST", url: `${BACKEND}/api/ocr/annotate/json`, respond: { json: result } },
    ]);
    await expect(ocr.analyzeDocument(pdfFile(), "IR")).resolves.toEqual(result);
  });

  // BUG: annotateDocument wraps its can_proceed check in a try/catch that replaces
  // the server's limit message with a generic "Unable to verify ..." error
  // (src/utils/ocr-api.ts:91-99; same pattern in analyzeDocument at :227-235).
  // submitOCRJob does this correctly. (Both functions are currently unused by the UI.)
  it.fails("annotateDocument keeps the server's limit message when can_proceed=false", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: { json: { can_proceed: false, message: "Free evaluation limit reached" } } },
    ]);
    await expect(ocr.annotateDocument(pdfFile(), "user_1", "IR")).rejects.toThrow("Free evaluation limit reached");
  });
});

describe("job polling helpers", () => {
  it("getJobStatus returns the status JSON, null on 404, and throws on other errors", async () => {
    mockFetch([
      { url: `${BACKEND}/api/ocr/job/ok`, respond: { json: { job_id: "ok", status: "running" } } },
      { url: `${BACKEND}/api/ocr/job/missing`, respond: { status: 404, json: {} } },
      { url: `${BACKEND}/api/ocr/job/bad`, respond: { status: 500, json: { error: "worker crashed" } } },
      { url: `${BACKEND}/api/ocr/job/offline`, respond: { networkError: true } },
    ]);
    await expect(ocr.getJobStatus("ok")).resolves.toMatchObject({ status: "running" });
    await expect(ocr.getJobStatus("missing")).resolves.toBeNull();
    await expect(ocr.getJobStatus("bad")).rejects.toThrow("worker crashed");
    await expect(ocr.getJobStatus("offline")).rejects.toThrow("Failed to fetch");
  });

  it("getProgress never throws: 404, 5xx and network errors all yield null", async () => {
    mockFetch([
      { url: `${BACKEND}/api/ocr/progress/ok`, respond: { json: { progress_percent: 42, step_number: 2, total_steps: 5 } } },
      { url: `${BACKEND}/api/ocr/progress/missing`, respond: { status: 404, json: {} } },
      { url: `${BACKEND}/api/ocr/progress/bad`, respond: { status: 500, json: {} } },
      { url: `${BACKEND}/api/ocr/progress/offline`, respond: { networkError: true } },
    ]);
    await expect(ocr.getProgress("ok")).resolves.toMatchObject({ progress_percent: 42 });
    await expect(ocr.getProgress("missing")).resolves.toBeNull();
    await expect(ocr.getProgress("bad")).resolves.toBeNull();
    await expect(ocr.getProgress("offline")).resolves.toBeNull();
  });

  it("simulates a polling cycle: progress rises until the job completes", async () => {
    mockFetch([
      {
        url: `${BACKEND}/api/ocr/progress/req-1`,
        sequence: [
          { json: { progress_percent: 10, step_number: 1, total_steps: 4 } },
          { json: { progress_percent: 60, step_number: 3, total_steps: 4 } },
          { json: { progress_percent: 100, step_number: 4, total_steps: 4 } },
        ],
      },
      {
        url: `${BACKEND}/api/ocr/job/job-1`,
        sequence: [{ json: { status: "running" } }, { json: { status: "running" } }, { json: { status: "completed" } }],
      },
    ]);
    const seen: Array<[number, string]> = [];
    for (let i = 0; i < 3; i++) {
      const progress = await ocr.getProgress("req-1");
      const status = await ocr.getJobStatus("job-1");
      seen.push([progress!.progress_percent, status!.status]);
    }
    expect(seen).toEqual([
      [10, "running"],
      [60, "running"],
      [100, "completed"],
    ]);
  });

  it("cancelJob POSTs to the cancel endpoint and throws on failure", async () => {
    const spy = mockFetch([
      { method: "POST", url: `${BACKEND}/api/ocr/job/j1/cancel`, respond: { json: { ok: true } } },
      { method: "POST", url: `${BACKEND}/api/ocr/job/j2/cancel`, respond: { status: 409, json: { error: "already finished" } } },
    ]);
    await expect(ocr.cancelJob("j1")).resolves.toBeUndefined();
    await expect(ocr.cancelJob("j2")).rejects.toThrow("already finished");
    expect(fetchCalls(spy)).toEqual([`POST ${BACKEND}/api/ocr/job/j1/cancel`, `POST ${BACKEND}/api/ocr/job/j2/cancel`]);
  });

  it("getJobResult decodes the PDF and keeps backend metadata", async () => {
    const metadata = { detected_question: "Q", score: { total_score: 14, max_score: 20, dimensions: [] } };
    mockFetch([{ url: `${BACKEND}/api/ocr/job/j1/result`, respond: { json: { pdf_base64: btoa("PDFDATA"), metadata } } }]);
    const result = await ocr.getJobResult("j1");
    expect(result.metadata).toEqual(metadata);
    expect(result.pdfBlob.size).toBe(7);
  });

  it("getJobResult defaults metadata (subject from payload) and throws on HTTP errors", async () => {
    mockFetch([
      { url: `${BACKEND}/api/ocr/job/j1/result`, respond: { json: { pdf_base64: btoa("x"), subject: "IR" } } },
      { url: `${BACKEND}/api/ocr/job/j2/result`, respond: { status: 410, json: { error: "expired" } } },
    ]);
    await expect(ocr.getJobResult("j1")).resolves.toMatchObject({ metadata: { metadata: { subject: "IR" } } });
    await expect(ocr.getJobResult("j2")).rejects.toThrow("expired");
  });
});

const pipelines = [
  {
    name: "essay",
    submit: ocr.submitEssayJob,
    status: ocr.getEssayJobStatus,
    result: ocr.getEssayJobResult,
    base: `${BACKEND}/api/essay`,
    pipelineField: undefined,
    submitError: "Submission failed",
    resultError: "Failed to get result",
  },
  {
    name: "outline",
    submit: ocr.submitOutlineJob,
    status: ocr.getOutlineJobStatus,
    result: ocr.getOutlineJobResult,
    base: `${BACKEND}/api/outline`,
    pipelineField: "outline",
    submitError: "Outline submission failed",
    resultError: "Failed to get outline result",
  },
  {
    name: "precis",
    submit: ocr.submitPrecisJob,
    status: ocr.getPrecisJobStatus,
    result: ocr.getPrecisJobResult,
    base: `${BACKEND}/api/precis`,
    pipelineField: "precis",
    submitError: "Precis submission failed",
    resultError: "Failed to get precis result",
  },
] as const;

describe.each(pipelines)("$name pipeline", (p) => {
  it("is gated by the shared evaluation limit (429 -> message, no submission)", async () => {
    const spy = mockFetch([{ method: "POST", url: "/api/ocr/check-limit", respond: { status: 429, json: {} } }]);
    await expect(p.submit(pdfFile(), "user_1")).rejects.toThrow(
      "You have used your free evaluation. Upgrade to Pro for unlimited evaluations."
    );
    expect(fetchCalls(spy)).toEqual(["POST /api/ocr/check-limit"]);
  });

  it("refuses when the limit check errors or says can_proceed=false", async () => {
    mockFetch([{ method: "POST", url: "/api/ocr/check-limit", sequence: [{ status: 502, text: "bad gateway" }, { json: { can_proceed: false, message: "No evaluations left" } }] }]);
    await expect(p.submit(pdfFile(), "user_1")).rejects.toThrow("Unable to verify evaluation limits");
    await expect(p.submit(pdfFile(), "user_1")).rejects.toThrow("No evaluations left");
  });

  it("refuses when usage cannot be recorded", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: { status: 500, json: {} } },
    ]);
    await expect(p.submit(pdfFile(), "user_1")).rejects.toThrow("Failed to record evaluation usage. Please try again.");
  });

  it("submits the file to its own backend pipeline", async () => {
    const spy = mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
      { method: "POST", url: `${p.base}/submit`, respond: { json: { jobId: "j", requestId: "r" } } },
    ]);
    await expect(p.submit(pdfFile(), "user_1")).resolves.toEqual({ jobId: "j", requestId: "r" });
    const fields = formFields(spy.mock.calls[2][1]);
    expect(fields).toMatchObject({ file: "file:answer.pdf", user_id: "user_1" });
    expect(fields.pipeline).toBe(p.pipelineField);
  });

  it("throws a pipeline-specific error when submission fails", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
      { method: "POST", url: `${p.base}/submit`, respond: { status: 500, json: {} } },
    ]);
    await expect(p.submit(pdfFile(), "user_1")).rejects.toThrow(p.submitError);
  });

  it("status returns JSON, or null when the request fails", async () => {
    mockFetch([
      { url: `${p.base}/status/j1`, respond: { json: { status: "running" } } },
      { url: `${p.base}/status/j2`, respond: { status: 404, json: {} } },
    ]);
    await expect(p.status("j1")).resolves.toEqual({ status: "running" });
    await expect(p.status("j2")).resolves.toBeNull();
  });

  it("result prefixes relative PDF URLs with the backend and keeps absolute ones", async () => {
    mockFetch([
      { url: `${p.base}/result/rel`, respond: { json: { result: { a: 1 }, annotated_pdf_url: "/files/rel.pdf" } } },
      { url: `${p.base}/result/abs`, respond: { json: { annotated_pdf_url: "https://cdn.test/abs.pdf" } } },
      { url: `${p.base}/result/bad`, respond: { status: 500, json: {} } },
    ]);
    await expect(p.result("rel")).resolves.toEqual({ result: { a: 1 }, annotated_pdf_url: `${BACKEND}/files/rel.pdf` });
    await expect(p.result("abs")).resolves.toEqual({ annotated_pdf_url: "https://cdn.test/abs.pdf" });
    await expect(p.result("bad")).rejects.toThrow(p.resultError);
  });
});

describe("gradeEssay (legacy blocking helper)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("requires a user and a passing limit check", async () => {
    await expect(ocr.gradeEssay(pdfFile(), "")).rejects.toThrow("User ID is required");
    mockFetch([{ method: "POST", url: "/api/ocr/check-limit", respond: { json: { can_proceed: false, message: "nope" } } }]);
    await expect(ocr.gradeEssay(pdfFile(), "u")).rejects.toThrow("nope");
  });

  it("polls every 2s until the job completes, then returns the result", async () => {
    const spy = mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: `${BACKEND}/api/essay/submit`, respond: { json: { jobId: "e1", requestId: "r1" } } },
      { url: `${BACKEND}/api/essay/status/e1`, sequence: [{ json: { status: "running" } }, { json: { status: "completed" } }] },
      { url: `${BACKEND}/api/essay/result/e1`, respond: { json: { annotated_pdf_url: "https://x/y.pdf", result: { score: 12 } } } },
      { method: "POST", url: "/api/ocr/record-usage", respond: recorded },
    ]);
    const promise = ocr.gradeEssay(pdfFile(), "u");
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchCalls(spy).filter((c) => c.includes("/status/"))).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual({ pdfUrl: "https://x/y.pdf", result: { score: 12 } });
  });

  it("rejects when the backend reports the job failed", async () => {
    mockFetch([
      { method: "POST", url: "/api/ocr/check-limit", respond: allowLimit },
      { method: "POST", url: `${BACKEND}/api/essay/submit`, respond: { json: { jobId: "e1" } } },
      { url: `${BACKEND}/api/essay/status/e1`, respond: { json: { status: "failed", error: "Unreadable scan" } } },
    ]);
    const promise = ocr.gradeEssay(pdfFile(), "u");
    const assertion = expect(promise).rejects.toThrow("Unreadable scan");
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;
  });
});
