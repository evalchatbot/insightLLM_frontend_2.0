import { NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';
import { countPdfPages } from '@/utils/pdf-utils';

interface OCRResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  usage?: any;
  limits?: any;
}

export async function POST(req: NextRequest): Promise<NextResponse<OCRResponse>> {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: "File is required" }, { status: 400 });
    }

    // Get user's email from Clerk
    let userEmail: string | null = null;
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      if (clerkUser?.emailAddresses && clerkUser.emailAddresses.length > 0) {
        userEmail = clerkUser.emailAddresses[0].emailAddress;
      }
    } catch (e) {
      console.error('Failed to fetch Clerk user:', e);
      return NextResponse.json({ success: false, error: "Authentication error" }, { status: 401 });
    }

    if (!userEmail) {
      return NextResponse.json({ success: false, error: "Email not found" }, { status: 400 });
    }

    // Initialize Supabase client with service role key for admin operations
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    
    // Get Supabase user
    const { data: supUser, error: supUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (supUserError || !supUser) {
      console.error('Failed to find Supabase user:', supUserError);
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Process OCR here
    // ... your OCR logic ...
    
    // Get OCR text from your OCR service
    const ocrText = 'Sample OCR text'; // Replace with actual OCR text
    
    // Calculate tokens from OCR text
    // Simple approximation: ~4 chars per token
    const outputTokens = Math.ceil(ocrText.length / 4);

    // Record output tokens
    const { error: outputUsageError } = await supabase
      .rpc('record_usage', {
        p_user_id: supUser.id,
        p_input_tokens: 0,
        p_output_tokens: outputTokens
      });

    if (outputUsageError) {
      console.error('Failed to record output usage:', outputUsageError);
      if (outputUsageError.message.includes('limit exceeded')) {
        return NextResponse.json({ 
          success: false, 
          error: "Monthly token limit exceeded" 
        }, { status: 429 });
      }
      return NextResponse.json({ 
        success: false, 
        error: "Usage tracking failed" 
      }, { status: 500 });
    }

    // Get current usage state for response
    const { data: currentUsage, error: usageError } = await supabase
      .rpc('record_usage', {
        p_user_id: supUser.id,
        p_input_tokens: 0,
        p_output_tokens: 0
      });

    return NextResponse.json({
      success: true,
      data: {
        text: ocrText
      },
      usage: currentUsage
    });

  } catch (error: any) {
    console.error('OCR error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to process OCR"
    }, { status: 500 });
  }
}