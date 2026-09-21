import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetClerk, signInAs } from "../helpers/clerk";
import { fetchCalls, mockFetch } from "../helpers/fetch";

vi.mock("@clerk/nextjs", async () => (await import("../helpers/clerk")).clerkClientModule);
vi.mock("@/utils/ocr-api", () => ({
  annotateDocument: vi.fn(),
  gradeEssay: vi.fn(),
  submitOCRJob: vi.fn(),
  getJobStatus: vi.fn(),
  getProgress: vi.fn(),
  cancelJob: vi.fn(),
  getJobResult: vi.fn(),
  submitEssayJob: vi.fn(),
  getEssayJobStatus: vi.fn(),
  getEssayJobResult: vi.fn(),
  submitOutlineJob: vi.fn(),
  getOutlineJobStatus: vi.fn(),
  getOutlineJobResult: vi.fn(),
  submitPrecisJob: vi.fn(),
  getPrecisJobStatus: vi.fn(),
  getPrecisJobResult: vi.fn(),
}));

import OCRUpload from "@/components/OCRUpload";
import * as api from "@/utils/ocr-api";
import insightZustand from "@/utils/insight-zustand";

const m = vi.mocked(api);
const SUBJECTS_URL = "http://backend.test/api/ocr/subjects";
const BACKEND_SUBJECTS = [
  { id: "ir", display_name: "IR" },
  { id: "pak", display_name: "Pak Affairs" },
  { id: "islamiat", display_name: "Islamic studies" },
  { id: "ca", display_name: "Current Affairs" },
  { id: "soc", display_name: "Sociology" },
  { id: "claw", display_name: "CLAW" },
];

const pdf = () => new File(["%PDF-1.4"], "answer.pdf", { type: "application/pdf" });
const metadata = {
  detected_question: "Q",
  answer_summary: "",
  strengths: [],
  improvements: [],
  final_comments: "",
  score: { total_score: 14, max_score: 20, dimensions: [] },
  metadata: { page_count: 2, answer_char_count: 10, answer_word_count: 2, subject: "ir" },
};

function mockSubjects(subjects = BACKEND_SUBJECTS) {
  return mockFetch([{ url: SUBJECTS_URL, respond: { json: { subjects } } }]);
}

function selects() {
  const [exam, subject] = screen.getAllByRole("combobox") as HTMLSelectElement[];
  return { exam, subject };
}

function fileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

async function renderReady(props: Parameters<typeof OCRUpload>[0] = {}) {
  const user = userEvent.setup({ applyAccept: false });
  const view = render(<OCRUpload {...props} />);
  return { user, ...view };
}

async function choose(user: ReturnType<typeof userEvent.setup>, exam: string, subjectId: string) {
  await user.selectOptions(selects().exam, exam);
  await waitFor(() => expect(selects().subject).toBeEnabled());
  await user.selectOptions(selects().subject, subjectId);
}

beforeEach(() => {
  resetClerk();
  signInAs();
  insightZustand.setState({ devToast: null });
  m.getProgress.mockResolvedValue(null);
});

describe("OCRUpload - subjects", () => {
  it("loads subjects from the backend and caches them in localStorage", async () => {
    const spy = mockSubjects();
    const { user } = await renderReady();
    await user.selectOptions(selects().exam, "CSS");
    await waitFor(() => expect(selects().subject).toBeEnabled());
    expect(fetchCalls(spy)).toEqual([`GET ${SUBJECTS_URL}`]);
    expect(JSON.parse(localStorage.getItem("ocr_subjects")!)).toEqual(BACKEND_SUBJECTS);
    expect(localStorage.getItem("ocr_subjects_timestamp")).toMatch(/^\d+$/);
  });

  it("groups CSS subjects, maps short names and always offers English Essay/Precis", async () => {
    mockSubjects();
    const { user } = await renderReady();
    await user.selectOptions(selects().exam, "CSS");
    await waitFor(() => expect(selects().subject).toBeEnabled());
    const compulsory = within(selects().subject).getByRole("group", { name: "COMPULSORY SUBJECTS" });
    const optional = within(selects().subject).getByRole("group", { name: "OPTIONAL SUBJECTS" });
    const names = (el: HTMLElement) => within(el).getAllByRole("option").map((o) => o.textContent);
    expect(names(compulsory)).toEqual(["English Essay", "Pakistan Affairs", "Islamic Studies", "Current Affairs", "English Precis"]);
    expect(names(optional)).toEqual(["International Relations", "Sociology", "Constitutional Law"]);
  });

  it("limits PMS optional subjects to the PMS list", async () => {
    mockSubjects();
    const { user } = await renderReady();
    await user.selectOptions(selects().exam, "PMS");
    await waitFor(() => expect(selects().subject).toBeEnabled());
    const optional = within(selects().subject).getByRole("group", { name: "OPTIONAL SUBJECTS" });
    expect(within(optional).getAllByRole("option").map((o) => o.textContent)).toEqual(["Sociology"]);
    const compulsory = within(selects().subject).getByRole("group", { name: "COMPULSORY SUBJECTS" });
    expect(within(compulsory).queryByRole("option", { name: "Current Affairs" })).toBeNull();
  });

  it("keeps the subject picker disabled until an exam is chosen", async () => {
    mockSubjects();
    await renderReady();
    await waitFor(() => expect(within(selects().subject).getByRole("option")).toHaveTextContent("Select an exam first"));
    expect(selects().subject).toBeDisabled();
  });

  it("uses a fresh cache without calling the backend", async () => {
    localStorage.setItem("ocr_subjects", JSON.stringify([{ id: "cached", display_name: "Cached Subject" }]));
    localStorage.setItem("ocr_subjects_timestamp", String(Date.now()));
    const { user } = await renderReady();
    await user.selectOptions(selects().exam, "CSS");
    await waitFor(() => expect(within(selects().subject).getByRole("option", { name: "Cached Subject" })).toBeInTheDocument());
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("falls back to an expired cache when the backend is down", async () => {
    localStorage.setItem("ocr_subjects", JSON.stringify([{ id: "old", display_name: "Old Subject" }]));
    localStorage.setItem("ocr_subjects_timestamp", String(Date.now() - 10 * 60 * 1000));
    const spy = mockFetch([{ url: SUBJECTS_URL, respond: { status: 503, text: "down" } }]);
    const { user } = await renderReady();
    await user.selectOptions(selects().exam, "CSS");
    await waitFor(() => expect(within(selects().subject).getByRole("option", { name: "Old Subject" })).toBeInTheDocument());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("offers no subjects when the backend is down and nothing is cached", async () => {
    mockFetch([{ url: SUBJECTS_URL, respond: { networkError: true } }]);
    const { user } = await renderReady();
    await user.selectOptions(selects().exam, "CSS");
    await waitFor(() => expect(selects().subject).toBeEnabled());
    expect(within(selects().subject).queryAllByRole("option")).toHaveLength(0);
  });
});

describe("OCRUpload - file validation and modes", () => {
  it("rejects non-PDF files", async () => {
    mockSubjects();
    const { user } = await renderReady();
    await user.upload(fileInput(), new File(["hi"], "notes.docx", { type: "application/msword" }));
    expect(screen.getByText("Please select a PDF file")).toBeInTheDocument();
    expect(screen.queryByText("notes.docx")).toBeNull();
  });

  it("rejects PDFs over 20MB", async () => {
    mockSubjects();
    const { user } = await renderReady();
    const big = pdf();
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    await user.upload(fileInput(), big);
    expect(screen.getByText("File size must be less than 20MB")).toBeInTheDocument();
  });

  it("accepts a PDF and shows its name", async () => {
    mockSubjects();
    const { user } = await renderReady();
    await user.upload(fileInput(), pdf());
    expect(screen.getByText("answer.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Please select a PDF file")).toBeNull();
  });

  it("shows Essay mode (full analysis + outline) for English Essay", async () => {
    mockSubjects();
    const { user } = await renderReady();
    await choose(user, "CSS", "english_essay");
    expect(screen.getByRole("button", { name: "Complete Essay Analysis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outline Only" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Analyze" })).toBeNull();
  });

  it("shows Precis mode for English Precis", async () => {
    mockSubjects();
    const { user } = await renderReady();
    await choose(user, "PMS", "english_precis");
    expect(screen.getByRole("button", { name: "Analyze Precis" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Essay Analysis" })).toBeNull();
  });

  it("shows the regular Analyze button for other subjects, enabled only with exam + subject + PDF", async () => {
    mockSubjects();
    const { user } = await renderReady();
    const analyze = () => screen.getByRole("button", { name: "Analyze" });
    expect(analyze()).toBeDisabled();
    await choose(user, "CSS", "ir");
    expect(analyze()).toBeDisabled();
    await user.upload(fileInput(), pdf());
    expect(analyze()).toBeEnabled();
  });

  it("asks signed-out users to sign in and keeps Analyze disabled", async () => {
    resetClerk();
    mockSubjects();
    const { user } = await renderReady();
    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    await choose(user, "CSS", "ir");
    await user.upload(fileInput(), pdf());
    expect(screen.getByRole("button", { name: "Analyze" })).toBeDisabled();
  });

  it("opens and closes the document guidelines", async () => {
    mockSubjects();
    const { user } = await renderReady();
    await user.click(screen.getByRole("button", { name: "Document Guidelines" }));
    expect(screen.getByRole("heading", { name: "Document Guidelines" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Understood" }));
    expect(screen.queryByRole("heading", { name: "Document Guidelines" })).toBeNull();
  });
});

describe("OCRUpload - evaluation flows", () => {
  async function ready(subjectExam: [string, string], props = {}) {
    mockFetch([
      { url: SUBJECTS_URL, respond: { json: { subjects: BACKEND_SUBJECTS } } },
      { url: "http://backend.test/files/essay.pdf", respond: { text: "%PDF-annotated" } },
    ]);
    const r = await renderReady(props);
    await choose(r.user, subjectExam[0], subjectExam[1]);
    await r.user.upload(fileInput(), pdf());
    return r;
  }

  it("regular subject: submits an OCR job, polls, and shows the report", async () => {
    m.submitOCRJob.mockResolvedValue({ jobId: "job-1", requestId: "req-1" });
    m.getJobStatus.mockResolvedValue({ status: "completed" } as any);
    m.getJobResult.mockResolvedValue({ pdfBlob: new Blob(["%PDF"], { type: "application/pdf" }), metadata } as any);
    const onResults = vi.fn();
    const onAnnotatedPDF = vi.fn();
    const { user } = await ready(["CSS", "ir"], { onResults, onAnnotatedPDF });

    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByText("Evaluation Report Ready")).toBeInTheDocument();
    expect(m.submitOCRJob).toHaveBeenCalledWith(expect.any(File), "user_test_123", "ir");
    expect(m.getJobStatus).toHaveBeenCalledWith("job-1");
    expect(m.getProgress).toHaveBeenCalledWith("req-1");
    expect(onResults).toHaveBeenCalledWith(metadata);
    expect(onAnnotatedPDF).toHaveBeenCalledWith(expect.stringMatching(/^blob:/));
    expect(m.submitEssayJob).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Download Report" })).toBeInTheDocument();
  });

  it("essay: uses the essay pipeline and downloads the annotated PDF", async () => {
    m.submitEssayJob.mockResolvedValue({ jobId: "e-1", requestId: "r-1" });
    m.getEssayJobStatus.mockResolvedValue({ status: "completed" });
    m.getEssayJobResult.mockResolvedValue({ result: metadata, annotated_pdf_url: "http://backend.test/files/essay.pdf" });
    const onAnnotatedPDF = vi.fn();
    const { user } = await ready(["CSS", "english_essay"], { onAnnotatedPDF });

    await user.click(screen.getByRole("button", { name: "Complete Essay Analysis" }));

    expect(await screen.findByText("Evaluation Report Ready")).toBeInTheDocument();
    expect(m.submitEssayJob).toHaveBeenCalledWith(expect.any(File), "user_test_123");
    expect(m.getEssayJobStatus).toHaveBeenCalledWith("e-1");
    expect(onAnnotatedPDF).toHaveBeenCalledWith("http://backend.test/files/essay.pdf");
    expect(m.submitOCRJob).not.toHaveBeenCalled();
  });

  it("essay 'Outline Only' uses the outline pipeline", async () => {
    m.submitOutlineJob.mockResolvedValue({ jobId: "o-1", requestId: "r-1" });
    m.getOutlineJobStatus.mockResolvedValue({ status: "running" });
    const { user, unmount } = await ready(["CSS", "english_essay"]);
    await user.click(screen.getByRole("button", { name: "Outline Only" }));
    await waitFor(() => expect(m.getOutlineJobStatus).toHaveBeenCalledWith("o-1"));
    expect(screen.getByRole("button", { name: "Evaluating Outline..." })).toBeDisabled();
    expect(m.submitEssayJob).not.toHaveBeenCalled();
    unmount();
  });

  it("precis: uses the precis pipeline", async () => {
    m.submitPrecisJob.mockResolvedValue({ jobId: "p-1", requestId: "r-1" });
    m.getPrecisJobStatus.mockResolvedValue({ status: "completed" });
    m.getPrecisJobResult.mockResolvedValue({ result: metadata, annotated_pdf_url: null });
    const onResults = vi.fn();
    const { user } = await ready(["PMS", "english_precis"], { onResults });
    await user.click(screen.getByRole("button", { name: "Analyze Precis" }));
    await waitFor(() => expect(onResults).toHaveBeenCalledWith(metadata));
    expect(m.submitPrecisJob).toHaveBeenCalledWith(expect.any(File), "user_test_123");
  });

  it("shows the backend error when the job fails", async () => {
    m.submitOCRJob.mockResolvedValue({ jobId: "job-1", requestId: "req-1" });
    m.getJobStatus.mockResolvedValue({ status: "failed", error: "Unreadable scan" } as any);
    const { user } = await ready(["CSS", "ir"]);
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(await screen.findByText("Unreadable scan")).toBeInTheDocument();
    expect(insightZustand.getState().devToast).toBe("Unreadable scan");
    expect(screen.getByRole("button", { name: "Analyze" })).toBeEnabled();
  });

  it("surfaces usage-limit errors verbatim and asks the app to refresh pro status", async () => {
    m.submitOCRJob.mockRejectedValue(new Error("OCR limit reached. Please upgrade to Pro or wait for next month."));
    const listener = vi.fn();
    window.addEventListener("refreshProStatus", listener);
    const { user } = await ready(["CSS", "ir"]);
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(await screen.findByText("OCR limit reached. Please upgrade to Pro or wait for next month.")).toBeInTheDocument();
    window.removeEventListener("refreshProStatus", listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(m.getJobStatus).not.toHaveBeenCalled();
  });

  it("maps a 503 from the backend to a friendly message", async () => {
    m.submitOCRJob.mockRejectedValue(new Error("HTTP 503: Service Unavailable"));
    const { user } = await ready(["CSS", "ir"]);
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(await screen.findByText("OCR service is temporarily unavailable. Please try again later.")).toBeInTheDocument();
  });

  it("shows live progress and lets the user cancel a running job", async () => {
    m.submitOCRJob.mockResolvedValue({ jobId: "job-7", requestId: "req-7" });
    m.getJobStatus.mockResolvedValue({ status: "running" } as any);
    m.getProgress.mockResolvedValue({
      progress_percent: 40,
      step: "ocr",
      step_number: 2,
      total_steps: 5,
      message: "Reading handwriting",
      details: { pages_completed: 1, total_pages: 3 },
    } as any);
    m.cancelJob.mockResolvedValue(undefined);
    const { user } = await ready(["CSS", "ir"]);
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByText("Reading handwriting (Page 1 of 3)")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 pages")).toBeInTheDocument();

    await user.click(screen.getByTitle("Cancel job"));
    expect(m.cancelJob).toHaveBeenCalledWith("job-7");
    expect(await screen.findByText("Job cancelled by user")).toBeInTheDocument();
  });

  // BUG: pollStatus stores the status *string* in jobStatus
  // (`setJobStatus(status.status || status)`, src/components/OCRUpload.tsx:443-444)
  // but the render checks `jobStatus.status === "running"` (:838), so the
  // "Processing in background... Job ID" hint never appears for running jobs.
  it.fails("tells the user the job keeps running in the background", async () => {
    m.submitOCRJob.mockResolvedValue({ jobId: "job-9", requestId: "req-9" });
    m.getJobStatus.mockResolvedValue({ status: "running" } as any);
    const { user, unmount } = await ready(["CSS", "ir"]);
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    await waitFor(() => expect(m.getJobStatus).toHaveBeenCalled());
    try {
      expect(await screen.findByText("Processing in background...", {}, { timeout: 500 })).toBeInTheDocument();
    } finally {
      unmount();
    }
  });

  // BUG: any error message containing "OCR" is rewritten to "OCR extraction failed.
  // Please ensure the PDF contains readable text." (src/components/OCRUpload.tsx:600),
  // so a failed usage-limit check ("Unable to verify OCR usage limits...") tells the
  // user their PDF is unreadable.
  it.fails("does not blame the PDF when the usage limit could not be verified", async () => {
    m.submitOCRJob.mockRejectedValue(new Error("Unable to verify OCR usage limits. Please try again or contact support."));
    const { user } = await ready(["CSS", "ir"]);
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText(/OCR extraction failed/)).toBeNull();
    expect(screen.getByText(/Unable to verify OCR usage limits/)).toBeInTheDocument();
  });
});
