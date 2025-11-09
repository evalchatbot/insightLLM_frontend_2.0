import { createClient } from '@supabase/supabase-js';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

    // Fetch user email from Clerk to find matching Supabase user record
    // Retry logic for transient Clerk API failures
    let userEmail: string | null = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries && !userEmail) {
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
        break; // Success, exit retry loop
      } catch (e: any) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.error('Failed to fetch Clerk user after retries:', e);
          // Return graceful error instead of crashing
          return NextResponse.json(
            { 
              success: false, 
              message: 'Temporary authentication service issue. Please try again in a moment.',
              retry: true
            },
            { status: 503 } // 503 Service Unavailable
          );
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unable to fetch user information. Please refresh the page and try again.',
          retry: true
        },
        { status: 503 }
      );
    }

    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { success: false, message: "Key is required" },
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
      return NextResponse.json(
        { success: false, message: 'No matching Supabase user found for your account. Please contact admin to link your email.' },
        { status: 400 }
      );
    }

    const supabaseUserId = supabaseUser.id;

    // Check if user already has an active pro key (not expired)
    const { data: existingKey } = await supabase
      .from('keys')
      .select('expiry_date')
      .eq('used_by', supabaseUserId)
      .eq('is_used', true)
      .gt('expiry_date', new Date().toISOString())
      .order('expiry_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check if user has any expired pro keys (for informational purposes)
    const { data: expiredKey } = await supabase
      .from('keys')
      .select('expiry_date')
      .eq('used_by', supabaseUserId)
      .eq('is_used', true)
      .lte('expiry_date', new Date().toISOString())
      .order('expiry_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If user has an active pro key (not expired), check if they've exceeded their limits
    // If they've exceeded limits, allow them to activate a new key (which will reset usage)
    if (existingKey) {
      // Check current usage status via record_usage (this will tell us if limits are exceeded)
      const { data: usageData, error: usageError } = await supabase
        .rpc('record_usage', {
          p_user_id: supabaseUserId,
          p_input_tokens: 0,
          p_output_tokens: 0
        });

      // If record_usage returns success: false, user has exceeded limits
      // In this case, allow them to activate a new key to reset their usage
      if (usageData && !usageData.success) {
        // User has exceeded limits - allow activation of new key
        // The activate_pro_key function will reset their usage to 0
      } else if (usageData && usageData.is_pro) {
        // User has active pro key and hasn't exceeded limits
        // Don't allow activation of another key
        return NextResponse.json(
          { success: false, message: "You already have an active pro access. Your current pro subscription is still active." },
          { status: 400 }
        );
      } else {
        // User has active key but is_pro is false (might be a data inconsistency)
        // Allow activation to fix the state
      }
    } else if (expiredKey) {
      // User has an expired pro key - allow activation of new key
      // This will give them a fresh start with the new subscription
    }
    // If user has no keys at all (neither active nor expired), allow activation (this is the normal case)

    // Check if key exists and is unused
    const { data: keyData, error: keyError } = await supabase
      .from('keys')
      .select('*')
      .eq('key', key)
      .maybeSingle();

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

    // Activate the pro key (this will also create usage_pro row)
    const { data: activationResult, error: txnError } = await supabase.rpc('activate_pro_key', {
      key_id: keyData.id,
      user_identifier: supabaseUserId
    });

    if (txnError) {
      console.error("Transaction error:", txnError);
      throw txnError;
    }

    if (!activationResult || !activationResult.success) {
      console.error("Activation failed:", activationResult?.message || "Unknown error");
      throw new Error(activationResult?.message || "Failed to activate key");
    }

    return NextResponse.json({
      success: true,
      message: "Pro access activated successfully!",
      expiryDate: keyData.expiry_date,
      durationDays: keyData.duration_days
    });

  } catch (error: any) {
    console.error("Error verifying pro key:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to verify key" },
      { status: 500 }
    );
  }
}
