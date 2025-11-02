import { createClient } from '@supabase/supabase-js';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
  // Pass the incoming request to getAuth (cast to any to satisfy types)
  const { userId } = getAuth((req as any) as any);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (existingSubscription && new Date(existingSubscription.end_date) > new Date()) {
      return NextResponse.json(
        { success: false, message: "You already have an active subscription" },
        { status: 400 }
      );
    }    // Fetch user email from Clerk to find matching Supabase user record
    let userEmail: string | null = null;
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      // clerkUser.emailAddresses is an array of objects { emailAddress, id, ... }
      if (clerkUser?.emailAddresses && clerkUser.emailAddresses.length > 0) {
        userEmail = clerkUser.emailAddresses[0].emailAddress;
      } else if ((clerkUser as any)?.email) {
        // fallback for different Clerk SDK shapes
        userEmail = (clerkUser as any).email;
      }
    } catch (e) {
      console.warn('Unable to fetch user from Clerk:', e);
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: 'Unable to determine your email from auth provider. Please ensure your account has a verified email.' },
        { status: 400 }
      );
    }

    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { success: false, message: "Key is required" },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    const { data: activeSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (activeSubscription) {
      return NextResponse.json(
        { success: false, message: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // Check if key exists and is unused
    const { data: keyData, error: keyError } = await supabase
      .from('keys')
      .select('*')
      .eq('key', key)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json(
        { success: false, message: "Invalid key" },
        { status: 400 }
      );
    }

    if (keyData.is_used) {
      return NextResponse.json(
        { success: false, message: "This key has already been used" },
        { status: 400 }
      );
    }

    if (new Date(keyData.expiry_date) < new Date()) {
      return NextResponse.json(
        { success: false, message: "This key has expired" },
        { status: 400 }
      );
    }

    // Find corresponding Supabase user by email
    const { data: supabaseUser, error: supabaseUserError } = await supabase
      .from('users')
      .select('id,email')
      .eq('email', userEmail)
      .single();

    if (supabaseUserError || !supabaseUser) {
      // We cannot safely create a Supabase user here because the users.id primary key
      // must reference auth.users (Supabase Auth). In this setup the app uses Clerk for
      // authentication, so the Supabase users table must already contain a matching record
      // (linked by email). Return a helpful error so admin can link accounts.
      return NextResponse.json(
        { success: false, message: 'No matching Supabase user found for your account. Please contact admin to link your email.' },
        { status: 400 }
      );
    }

    const supabaseUserId = supabaseUser.id;

    // Begin transaction
    const { error: updateError } = await supabase
      .from('keys')
      .update({
        is_used: true,
        used_by: supabaseUserId,
      })
      .eq('id', keyData.id);

    if (updateError) {
      throw updateError;
    }

    // Create subscription entry
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + keyData.duration_days);

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: supabaseUserId,
        key_id: keyData.id,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        is_active: true
      });

    if (subscriptionError) {
      throw subscriptionError;
    }

    return NextResponse.json({
      success: true,
      message: "Pro access activated successfully!",
      expiryDate: endDate.toISOString(),
      durationDays: keyData.duration_days
    });

  } catch (error: any) {
    console.error("Error verifying pro key:", error);
    return NextResponse.json(
      { success: false, message: "Failed to verify key" },
      { status: 500 }
    );
  }
}