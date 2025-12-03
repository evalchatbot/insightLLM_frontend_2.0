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

  // Check OCR usage limit BEFORE processing (count-based, not token-based)
  // OCR tracks number of PDFs generated, not tokens
  
  try {
    const limitCheck = await fetch('/api/ocr/check-limit', {
      method: 'POST'
    });
    
    if (limitCheck.status === 429) {
      const errorData = await limitCheck.json();
      
      // If user was downgraded from pro to free, trigger status refresh
      if (errorData.downgraded || errorData.is_pro === false) {
        // Trigger immediate refresh
        window.dispatchEvent(new CustomEvent('refreshProStatus'));
        // Also use storage event as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem('proStatusRefresh', Date.now().toString());
        }
      }
      
      throw new Error(errorData.message || "OCR limit reached. Please upgrade to Pro or wait for next month.");
    }
    
    // If check-limit returns non-200 status, block the request
    if (!limitCheck.ok) {
      const errorText = await limitCheck.text();
      console.error('Failed to check OCR usage limit:', limitCheck.status, errorText);
      throw new Error("Unable to verify OCR usage limits. Please try again or contact support.");
    }
    
    // Verify that can_proceed is true before proceeding
    try {
      const limitData = await limitCheck.json();
      if (!limitData.can_proceed) {
        throw new Error(limitData.message || "OCR limit reached. Please upgrade to Pro or wait for next month.");
      }
    } catch (parseErr) {
      console.error('Failed to parse limit check response for OCR:', parseErr);
      throw new Error("Unable to verify OCR usage limits. Please try again.");
    }
  } catch (err: any) {
    // If it's a limit error, throw it
    if (err.message?.includes('limit') || err.message?.includes('Unable to verify')) {
      throw err;
    }
    console.error('Failed to check OCR usage limit:', err);
    throw new Error("Unable to verify OCR usage limits. Please try again or contact support.");
  }

  // ✅ RECORD OCR USAGE IMMEDIATELY - Count at pipeline start, not at PDF generation
  // This ensures tokens are charged even if user leaves page mid-processing
  try {
    const usageResponse = await fetch('/api/ocr/record-usage', {
      method: 'POST'
    });

    if (!usageResponse.ok) {
      console.error('Failed to record OCR usage count at pipeline start');
      throw new Error("Failed to record OCR usage. Please contact support.");
    }

    const usageData = await usageResponse.json();
    
    // Check if user was auto-downgraded from Pro to Free after hitting limit
    if (usageData.downgraded || (usageData.was_pro && !usageData.is_pro)) {
      // Trigger immediate refresh to update UI
      window.dispatchEvent(new CustomEvent('refreshProStatus'));
      if (typeof window !== 'undefined') {
        localStorage.setItem('proStatusRefresh', Date.now().toString());
      }
    }
  } catch (err) {
    console.error('Error recording OCR usage at pipeline start:', err);
    throw new Error("Failed to record OCR usage. Please try again.");
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

  // OCR usage already recorded at pipeline start (before backend processing)
  // No need to record again here

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

  // Check OCR usage limit BEFORE processing (count-based, not token-based)
  // OCR tracks number of PDFs generated, not tokens
  
  try {
    const limitCheck = await fetch('/api/ocr/check-limit', {
      method: 'POST'
    });
    
    if (limitCheck.status === 429) {
      const errorData = await limitCheck.json();
      
      // If user was downgraded from pro to free, trigger status refresh
      if (errorData.downgraded || errorData.is_pro === false) {
        // Trigger immediate refresh
        window.dispatchEvent(new CustomEvent('refreshProStatus'));
        // Also use storage event as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem('proStatusRefresh', Date.now().toString());
        }
      }
      
      throw new Error(errorData.message || "OCR limit reached. Please upgrade to Pro or wait for next month.");
    }
    
    // If check-limit returns non-200 status, block the request
    if (!limitCheck.ok) {
      const errorText = await limitCheck.text();
      console.error('Failed to check OCR usage limit:', limitCheck.status, errorText);
      throw new Error("Unable to verify OCR usage limits. Please try again or contact support.");
    }
    
    // Verify that can_proceed is true before proceeding
    try {
      const limitData = await limitCheck.json();
      if (!limitData.can_proceed) {
        throw new Error(limitData.message || "OCR limit reached. Please upgrade to Pro or wait for next month.");
      }
    } catch (parseErr) {
      console.error('Failed to parse limit check response for OCR:', parseErr);
      throw new Error("Unable to verify usage limits. Please try again.");
    }
  } catch (err: any) {
    // If it's a limit error, throw it
    if (err.message?.includes('limit') || err.message?.includes('Unable to verify')) {
      throw err;
    }
    console.error('Failed to check OCR usage limit:', err);
    throw new Error("Unable to verify OCR usage limits. Please try again or contact support.");
  }

  // ✅ RECORD OCR USAGE IMMEDIATELY - Count at pipeline start, not at completion
  // This ensures tokens are charged even if user leaves page mid-processing
  try {
    const usageResponse = await fetch('/api/ocr/record-usage', {
      method: 'POST'
    });

    if (!usageResponse.ok) {
      console.error('Failed to record OCR usage count at pipeline start');
      throw new Error("Failed to record OCR usage. Please contact support.");
    }

    const usageData = await usageResponse.json();
    
    // Check if user was auto-downgraded from Pro to Free after hitting limit
    if (usageData.downgraded || (usageData.was_pro && !usageData.is_pro)) {
      // Trigger immediate refresh to update UI
      window.dispatchEvent(new CustomEvent('refreshProStatus'));
      if (typeof window !== 'undefined') {
        localStorage.setItem('proStatusRefresh', Date.now().toString());
      }
    }
  } catch (err) {
    console.error('Error recording OCR usage at pipeline start:', err);
    throw new Error("Failed to record OCR usage. Please try again.");
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

  const data = await response.json();
  
  // OCR usage already recorded at pipeline start (before backend processing)
  // No need to record again here

  return data;
}
