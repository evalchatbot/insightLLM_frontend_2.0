import { NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { input_tokens = 0, output_tokens = 0 } = await req.json();

    // Get user's email from Clerk
    let userEmail: string | null = null;
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      if (clerkUser?.emailAddresses && clerkUser.emailAddresses.length > 0) {
        userEmail = clerkUser.emailAddresses[0].emailAddress;
      } else if ((clerkUser as any)?.email) {
        userEmail = (clerkUser as any).email;
      }
    } catch (e) {
      console.error('Failed to fetch Clerk user:', e);
      return NextResponse.json({ success: false, message: "Authentication error" }, { status: 401 });
    }

    if (!userEmail) {
      return NextResponse.json({ success: false, message: "Email not found" }, { status: 400 });
    }

    // Get Supabase user
    const { data: supUser, error: supUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (supUserError || !supUser) {
      console.error('Failed to find Supabase user:', supUserError);
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Record usage
    const { data: usageResult, error: usageError } = await supabase
      .rpc('record_usage', {
        p_user_id: supUser.id,
        p_input_tokens: input_tokens,
        p_output_tokens: output_tokens
      });

    // Only log errors, not successful operations (minimal logging)
    if (usageError) {
      console.error('❌ Failed to record usage:', usageError);
      if (usageError.message.includes('limit exceeded')) {
        return NextResponse.json({ 
          success: false, 
          message: "Monthly token limit exceeded" 
        }, { status: 429 });
      }
      return NextResponse.json({ 
        success: false, 
        message: "Usage tracking failed" 
      }, { status: 500 });
    }

    // Check if record_usage returned success: false (limit exceeded)
    // Note: record_usage returns { success: false, message: '...' } as data, not as an error
    if (usageResult && !usageResult.success) {
      console.error('⚠️ Usage limit exceeded:', usageResult.message);
      return NextResponse.json({ 
        success: false, 
        message: usageResult.message || "Monthly token limit exceeded",
        is_pro: usageResult.is_pro,
        downgraded: usageResult.downgraded || false,
        usage: usageResult.usage
      }, { status: 429 });
    }

    return NextResponse.json({ 
      success: true, 
      usage: usageResult?.usage || usageResult,
      is_pro: usageResult?.is_pro
    });
  } catch (error: any) {
    console.error('Error in usage tracking route:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Server error" 
    }, { status: 500 });
  }
}

