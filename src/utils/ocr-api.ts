"use client";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface OCRResult {
  issues: Array<{
    issue_id: string;
    issue_title: string;
    why_it_matters: string;
    how_to_verify: string;
    evidence_suggestions: string[];
    impact_points_0to3: number;
    location_hint: string;
  }>;
  score: {
    total_score: number;
    max_possible_score: number;
  };
  metadata: {
    file_name: string;
    page_count: number;
    processing_time_seconds: number;
  };
}

export interface OCRAnnotateResponse {
  annotated_pdf_url: string;
  metadata: OCRResult;
}

/**
 * Upload PDF for OCR annotation and get back the annotated PDF
 * Note: user_id should be obtained from useUser() hook in the component
 */
export async function annotateDocument(file: File, userId: string): Promise<Blob> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);

  const response = await fetch(`${BACKEND_URL}/api/ocr/annotate`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  // Return the PDF blob directly
  return response.blob();
}

/**
 * Upload PDF for OCR analysis and get only the metadata (no PDF)
 * Note: user_id should be obtained from useUser() hook in the component
 */
export async function analyzeDocument(file: File, userId: string): Promise<OCRResult> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);

  const response = await fetch(`${BACKEND_URL}/api/ocr/annotate/json`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}