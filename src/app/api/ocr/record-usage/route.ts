import { NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: "Unauthorized" 
      }, { status: 401 });
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ 
        success: false, 
        message: "Server configuration error" 
      }, { status: 500 });
    }

    // Create Supabase client
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

    // Get user's email from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: "Email not found" 
      }, { status: 400 });
    }

    // Get Supabase user
    const { data: supUser, error: supUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (supUserError || !supUser) {
      console.error('Failed to find Supabase user:', supUserError);
      return NextResponse.json({ 
        success: false, 
        message: "User not found" 
      }, { status: 404 });
    }

    // Call record_ocr_usage function (increments count by 1)
    const { data: usageResult, error: usageError } = await supabase
      .rpc('record_ocr_usage', {
        p_user_id: supUser.id
      });

    if (usageError) {
      console.error('❌ Failed to record OCR usage:', usageError);
      return NextResponse.json({ 
        success: false, 
        message: "Usage tracking failed" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: usageResult.message,
      is_pro: usageResult.is_pro,
      ocr_count: usageResult.ocr_count,
      ocr_limit: usageResult.ocr_limit
    });

  } catch (error: any) {
    console.error('Error in OCR usage recording route:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Server error" 
    }, { status: 500 });
  }
}
