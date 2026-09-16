"use client";

// Client for the Psychological Assessment evaluation flow (backend /api/psych/*).
// Mirrors the OCR job pattern: submit -> poll status/progress -> download PDF.

function normalizeApiUrl(url: string): string {
  if (url.startsWith("http:") && !url.startsWith("http://") && !url.startsWith("https://")) {
    return url.replace(/^http:/, "http://");
  }
  return url;
}

const BACKEND_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");

export interface PsychJobStatus {
  job_id: string;
  request_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  filename: string;
  subject: string;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  error?: string;
  result_available?: boolean;
}

export interface PsychProgress {
  request_id: string;
  step: string;
  step_number: number;
  total_steps: number;
  progress_percent: number;
  message: string;
  timestamp: number;
  updated_at: string;
}

export interface PsychMetadata {
  subject?: string;
  page_count?: number;
  section_pages?: Record<string, number[]>;
  annotation_count?: number;
  report?: {
    iq?: { correct?: number; total?: number; weakest?: string | null };
    suitability?: { label?: string; note?: string };
  };
}

export async function submitPsychJob(
  file: File,
  userId: string
): Promise<{ jobId: string; requestId: string }> {
  if (!userId) throw new Error("User ID is required");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);

  const response = await fetch(`${BACKEND_URL}/api/psych/submit`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  return { jobId: data.job_id, requestId: data.request_id };
}

export async function getPsychJobStatus(jobId: string): Promise<PsychJobStatus | null> {
  const response = await fetch(`${BACKEND_URL}/api/psych/job/${jobId}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

export async function getPsychProgress(requestId: string): Promise<PsychProgress | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/psych/progress/${requestId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function getPsychJobResult(
  jobId: string
): Promise<{ pdfBlob: Blob; metadata: PsychMetadata; filename: string }> {
  const response = await fetch(`${BACKEND_URL}/api/psych/job/${jobId}/result`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  const byteChars = atob(data.pdf_base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const pdfBlob = new Blob([bytes], { type: "application/pdf" });
  return { pdfBlob, metadata: data.metadata || {}, filename: data.filename || "psychological_assessment_report.pdf" };
}
