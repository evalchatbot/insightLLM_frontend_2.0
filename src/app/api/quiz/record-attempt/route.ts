import { NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';

// Record that the current user started an MCQ test (increments the lifetime free counter).
// Pro users are a no-op (unlimited).
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ success: false, message: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ success: false, message: "Email not found" }, { status: 400 });
    }

    const { data: supUser, error: supUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (supUserError || !supUser) {
      console.error('Failed to find Supabase user:', supUserError);
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const { data: result, error: recordError } = await supabase
      .rpc('record_mcq_attempt', { p_user_id: supUser.id });

    if (recordError) {
      console.error('Failed to record MCQ attempt:', recordError);
      return NextResponse.json({ success: false, message: "Failed to record MCQ attempt" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      is_pro: result?.is_pro,
      mcq_count: result?.mcq_count,
      mcq_limit: result?.mcq_limit,
    });
  } catch (error: any) {
    console.error('Error in MCQ record attempt route:', error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
