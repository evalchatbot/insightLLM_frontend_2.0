"use client";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface EvaluationDimension {
  label: string;
  score: number;
  max: number;
  comment: string;
}

export interface EvaluationScore {
  total_score: number | null;
  max_score: number;
  dimensions: EvaluationDimension[];
}

export interface EvaluationMetadata {
  page_count: number;
  answer_char_count: number;
  answer_word_count: number;
  subject: string;
}

export interface OCRResult {
  detected_question: string;
  answer_summary: string;
  strengths: string[];
  improvements: string[];
  final_comments: string;
  score: EvaluationScore;
  metadata: EvaluationMetadata;
}

/**
 * Upload PDF for OCR annotation and get back both the annotated PDF and metadata
 * Note: user_id should be obtained from useUser() hook in the component
 */
export async function annotateDocument(
  file: File,
  userId: string,
  subject: string
): Promise<{ pdfBlob: Blob; metadata: OCRResult }> {
  if (!userId) {
    throw new Error("User ID is required");
  }
  if (!subject || !subject.trim()) {
    throw new Error("Subject selection is required");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
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
  const metadata: OCRResult =
    data.metadata ||
    {
      detected_question: "",
      answer_summary: "",
      strengths: [],
      improvements: [],
      final_comments: "",
      score: { total_score: null, max_score: 20, dimensions: [] },
      metadata: {
        page_count: 0,
        answer_char_count: 0,
        answer_word_count: 0,
        subject: subject,
      },
    };

  return { pdfBlob, metadata };
}

/**
 * Upload PDF for OCR analysis and get only the metadata (no PDF)
 */
export async function analyzeDocument(file: File, subject: string): Promise<OCRResult> {
  if (!subject || !subject.trim()) {
    throw new Error("Subject selection is required");
  }

  const formData = new FormData();
  formData.append("file", file);
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
