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

  // Check usage limits BEFORE processing OCR
  // Estimate tokens: OCR typically uses more tokens (estimate based on file size)
  // Conservative estimate: assume 3000 input tokens and 5000 output tokens for OCR to prevent limit edge cases
  const estimatedInputTokens = 3000;
  const estimatedOutputTokens = 5000;
  
  try {
    const limitCheck = await fetch('/api/chat/check-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_tokens: estimatedInputTokens,
        output_tokens: estimatedOutputTokens
      })
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
      
      throw new Error(errorData.message || "Monthly token limit exceeded. Please upgrade to Pro or wait for next month.");
    }
    
    // If check-limit returns non-200 status, block the request
    if (!limitCheck.ok) {
      const errorText = await limitCheck.text();
      console.error('Failed to check usage limit for OCR:', limitCheck.status, errorText);
      throw new Error("Unable to verify usage limits. Please try again or contact support.");
    }
    
    // Verify that can_proceed is true before proceeding
    try {
      const limitData = await limitCheck.json();
      if (!limitData.can_proceed) {
        throw new Error(limitData.message || "Monthly token limit exceeded. Please upgrade to Pro or wait for next month.");
      }
    } catch (parseErr) {
      console.error('Failed to parse limit check response for OCR:', parseErr);
      throw new Error("Unable to verify usage limits. Please try again.");
    }
  } catch (err: any) {
    // If it's a limit exceeded error, throw it
    if (err.message?.includes('limit exceeded') || err.message?.includes('limit reached') || err.message?.includes('Unable to verify')) {
      throw err;
    }
    console.error('Failed to check usage limit for OCR:', err);
    throw new Error("Unable to verify usage limits. Please try again or contact support.");
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

  // If backend provided precise token usage, record it server-side
  const metaTokenUsage = data?.metadata?.token_usage;
  if (metaTokenUsage && (metaTokenUsage.input_tokens || metaTokenUsage.output_tokens)) {
    try {
      const usageResponse = await fetch('/api/chat/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_tokens: Number(metaTokenUsage.input_tokens) || 0,
          output_tokens: Number(metaTokenUsage.output_tokens) || 0,
        })
      });

      // If usage route indicates downgrade or limit, surface minimally
      if (!usageResponse.ok) {
        const err = await usageResponse.json().catch(() => ({}));
        console.warn('Failed to record OCR usage:', err);
        if (usageResponse.status === 429) {
          // Emit a refresh to update UI state if downgraded/limited
          window.dispatchEvent(new CustomEvent('refreshProStatus'));
          if (typeof window !== 'undefined') {
            localStorage.setItem('proStatusRefresh', Date.now().toString());
          }
        }
      }
    } catch (err) {
      console.warn('Error calling /api/chat/usage for OCR:', err);
    }
  }

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

  // Extract token usage from backend response if available
  const tokenUsage = data.metadata?.token_usage;
  if (tokenUsage) {
    // Record usage using actual token counts from backend
    try {
      const usageResponse = await fetch('/api/chat/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_tokens: tokenUsage.prompt_tokens || 0,
          output_tokens: tokenUsage.completion_tokens || 0
        })
      });
      
      // Check if user was downgraded
      if (usageResponse.status === 429) {
        const errorData = await usageResponse.json();
        if (errorData.downgraded || errorData.is_pro === false) {
          // Trigger immediate refresh
          window.dispatchEvent(new CustomEvent('refreshProStatus'));
          // Also use storage event as backup
          if (typeof window !== 'undefined') {
            localStorage.setItem('proStatusRefresh', Date.now().toString());
          }
        }
      } else if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        if (usageData.is_pro === false) {
          // User was downgraded, refresh status
          window.dispatchEvent(new CustomEvent('refreshProStatus'));
          // Also use storage event as backup
          if (typeof window !== 'undefined') {
            localStorage.setItem('proStatusRefresh', Date.now().toString());
          }
        }
      }
    } catch (err) {
      console.warn('Failed to track OCR usage:', err);
    }
  }

  return { pdfBlob, metadata };
}

/**
 * Upload PDF for OCR analysis and get only the metadata (no PDF)
 */
export async function analyzeDocument(file: File, subject: string): Promise<OCRResult> {
  if (!subject || !subject.trim()) {
    throw new Error("Subject selection is required");
  }

  // Check usage limits BEFORE processing OCR
  // Estimate tokens: OCR typically uses more tokens (estimate based on file size)
  // Conservative estimate: assume 3000 input tokens and 5000 output tokens for OCR to prevent limit edge cases
  const estimatedInputTokens = 3000;
  const estimatedOutputTokens = 5000;
  
  try {
    const limitCheck = await fetch('/api/chat/check-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_tokens: estimatedInputTokens,
        output_tokens: estimatedOutputTokens
      })
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
      
      throw new Error(errorData.message || "Monthly token limit exceeded. Please upgrade to Pro or wait for next month.");
    }
    
    // If check-limit returns non-200 status, block the request
    if (!limitCheck.ok) {
      const errorText = await limitCheck.text();
      console.error('Failed to check usage limit for OCR:', limitCheck.status, errorText);
      throw new Error("Unable to verify usage limits. Please try again or contact support.");
    }
    
    // Verify that can_proceed is true before proceeding
    try {
      const limitData = await limitCheck.json();
      if (!limitData.can_proceed) {
        throw new Error(limitData.message || "Monthly token limit exceeded. Please upgrade to Pro or wait for next month.");
      }
    } catch (parseErr) {
      console.error('Failed to parse limit check response for OCR:', parseErr);
      throw new Error("Unable to verify usage limits. Please try again.");
    }
  } catch (err: any) {
    // If it's a limit exceeded error, throw it
    if (err.message?.includes('limit exceeded') || err.message?.includes('limit reached') || err.message?.includes('Unable to verify')) {
      throw err;
    }
    console.error('Failed to check usage limit for OCR:', err);
    throw new Error("Unable to verify usage limits. Please try again or contact support.");
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
  
  // Extract token usage from backend response if available
  const tokenUsage = data.token_usage;
  if (tokenUsage) {
    // Record usage using actual token counts from backend
    try {
      const usageResponse = await fetch('/api/chat/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_tokens: tokenUsage.prompt_tokens || 0,
          output_tokens: tokenUsage.completion_tokens || 0
        })
      });
      
      // Check if user was downgraded
      if (usageResponse.status === 429) {
        const errorData = await usageResponse.json();
        if (errorData.downgraded || errorData.is_pro === false) {
          // Trigger immediate refresh
          window.dispatchEvent(new CustomEvent('refreshProStatus'));
          // Also use storage event as backup
          if (typeof window !== 'undefined') {
            localStorage.setItem('proStatusRefresh', Date.now().toString());
          }
        }
      } else if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        if (usageData.is_pro === false) {
          // User was downgraded, refresh status
          window.dispatchEvent(new CustomEvent('refreshProStatus'));
          // Also use storage event as backup
          if (typeof window !== 'undefined') {
            localStorage.setItem('proStatusRefresh', Date.now().toString());
          }
        }
      }
    } catch (err) {
      console.warn('Failed to track OCR usage:', err);
    }
  }

  return data;
}
