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
    max_achievable_score?: number;
  };
  metadata: {
    file_name: string;
    page_count: number;
    processing_time_seconds: number;
    fast_mode?: boolean;
    provided_question?: string;
    question_occurrences_removed?: number;
    question_occurrences_removed_per_page?: number[];
    answer_char_count?: number;
    overall_remark?: string; // For qualitative evaluations (e.g., Essay Outline): "Excellent", "Good", "Average", "Weak"
    subject?: {
      id: string;
      label: string;
    };
    scoring_profile?: {
      content_max: number;
      writing_max: number;
      total_max: number;
      achievable_max?: number;
      criteria: Array<{ label: string; max_points: number }>;
    };
  };
}

export interface OCRAnnotateResponse {
  annotated_pdf_url: string;
  metadata: OCRResult;
}

/**
 * Upload PDF for OCR annotation and get back both the annotated PDF and metadata
 * Note: user_id should be obtained from useUser() hook in the component
 */
export async function annotateDocument(
  file: File,
  userId: string,
  question: string,
  subject: string
): Promise<{ pdfBlob: Blob; metadata: OCRResult }> {
  if (!userId) {
    throw new Error("User ID is required");
  }
  if (!question || !question.trim()) {
    throw new Error("Question text is required");
  }
  if (!subject || !subject.trim()) {
    throw new Error("Subject selection is required");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  formData.append("question", question);
  formData.append("subject", subject);

  const response = await fetch(`${BACKEND_URL}/api/ocr/annotate`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  // Parse JSON response containing both PDF and metadata
  const data = await response.json();

  // Decode base64 PDF to Blob
  const base64Data = data.pdf_base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const pdfBlob = new Blob([bytes], { type: "application/pdf" });

  // Extract metadata
  const metadata: OCRResult = data.metadata || {
    issues: [],
    score: { total_score: 0, max_possible_score: 20 },
    metadata: {
      file_name: file.name,
      page_count: 0,
      processing_time_seconds: 0,
    },
  };

  return { pdfBlob, metadata };
}

/**
 * Upload PDF for OCR analysis and get only the metadata (no PDF)
 * Note: user_id should be obtained from useUser() hook in the component
 */
export async function analyzeDocument(file: File, userId: string, question: string, subject: string): Promise<OCRResult> {
  if (!userId) {
    throw new Error("User ID is required");
  }
  if (!question || !question.trim()) {
    throw new Error("Question text is required");
  }
  if (!subject || !subject.trim()) {
    throw new Error("Subject selection is required");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  formData.append("question", question);
  formData.append("subject", subject);

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
