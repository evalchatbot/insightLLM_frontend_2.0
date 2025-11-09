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

    // Check usage limits BEFORE processing
    const { data: limitCheck, error: limitError } = await supabase
      .rpc('check_usage_limit', {
        p_user_id: supUser.id,
        p_input_tokens: input_tokens,
        p_output_tokens: output_tokens
      });

    if (limitError) {
      console.error('Failed to check usage limit:', limitError);
      return NextResponse.json({ 
        success: false, 
        message: "Failed to check usage limit" 
      }, { status: 500 });
    }

    // Check if limit check returned success: false OR can_proceed: false (limit exceeded)
    if (limitCheck && (!limitCheck.can_proceed || !limitCheck.success)) {
      return NextResponse.json({ 
        success: false, 
        can_proceed: false,
        message: limitCheck.message || "Monthly token limit exceeded",
        is_pro: limitCheck.is_pro,
        downgraded: limitCheck.downgraded || false,
        usage: limitCheck.usage
      }, { status: 429 });
    }

    return NextResponse.json({ 
      success: true,
      can_proceed: true,
      message: "Usage within limits",
      is_pro: limitCheck?.is_pro || false
    });
  } catch (error: any) {
    console.error('Error in limit check route:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Server error" 
    }, { status: 500 });
  }
}

