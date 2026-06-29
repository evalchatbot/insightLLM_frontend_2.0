import { NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';

// Pre-check whether the current user may start an MCQ test.
// Free tier = 1 MCQ test for all time; Pro = unlimited.
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

    // Resolve Clerk user -> email -> Supabase user id
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

    const { data: limitCheck, error: limitError } = await supabase
      .rpc('check_mcq_limit', { p_user_id: supUser.id });

    if (limitError) {
      console.error('Failed to check MCQ limit:', limitError);
      return NextResponse.json({ success: false, message: "Failed to check MCQ limit" }, { status: 500 });
    }

    if (!limitCheck?.can_proceed) {
      return NextResponse.json({
        success: false,
        can_proceed: false,
        message: limitCheck?.message,
        is_pro: limitCheck?.is_pro,
        mcq_count: limitCheck?.mcq_count,
        mcq_limit: limitCheck?.mcq_limit,
      }, { status: 429 });
    }

    return NextResponse.json({
      success: true,
      can_proceed: true,
      message: limitCheck.message,
      is_pro: limitCheck.is_pro,
      mcq_count: limitCheck.mcq_count,
      mcq_limit: limitCheck.mcq_limit,
    });
  } catch (error: any) {
    console.error('Error in MCQ limit check route:', error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
