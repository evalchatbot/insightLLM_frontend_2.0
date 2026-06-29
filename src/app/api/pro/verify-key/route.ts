import { createClient } from '@supabase/supabase-js';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// =====================================================
// RENEWAL FUNCTIONALITY DISABLED
// =====================================================
// Maximum Expiry Cap constant removed - renewal is disabled
// This will be re-enabled when renewal feature is activated
// =====================================================

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

    // =====================================================
    // RENEWAL FUNCTIONALITY DISABLED
    // =====================================================
    // NOTE: Subscription renewal feature is currently disabled.
    // Users with active subscriptions are blocked from activating new keys.
    // This feature will be enabled in the future.
    // =====================================================
    
    // Block users with active subscriptions from activating new keys
    if (existingKey) {
      // Check current usage status via record_usage
      const { data: usageData } = await supabase
        .rpc('record_usage', {
          p_user_id: supabaseUserId,
          p_input_tokens: 0,
          p_output_tokens: 0
        });
      
      if (usageData && usageData.is_pro) {
        // User has active pro key and hasn't exceeded limits
        // Don't allow activation of another key (renewal disabled)
        return NextResponse.json(
          { 
            success: false, 
            message: "You already have an active pro access. Subscription renewal is currently disabled. Please wait until your current subscription expires before activating a new key." 
          },
          { status: 400 }
        );
      }
    }

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

    // =====================================================
    // RENEWAL FUNCTIONALITY DISABLED
    // =====================================================
    // Maximum Expiry Cap validation removed - renewal is disabled
    // =====================================================

    // =====================================================
    // Activate the pro key via database function
    // =====================================================
    // NOTE: Renewal functionality is disabled.
    // The activate_pro_key function still supports renewals in the database,
    // but the API blocks users with active subscriptions from reaching this point.
    const { data: activationResult, error: txnError } = await supabase.rpc('activate_pro_key', {
      key_id: keyData.id,
      user_identifier: supabaseUserId
    });

    if (txnError) {
      console.error("Transaction error:", txnError);
      throw txnError;
    }

    // =====================================================
    // CHANGE: Improved error handling
    // =====================================================
    // BEFORE: Threw error (500 status)
    // AFTER: Returns proper HTTP response (400 status) with error message
    // Why: Better error handling, proper HTTP status codes
    if (!activationResult || !activationResult.success) {
      console.error("Activation failed:", activationResult?.message || "Unknown error");
      return NextResponse.json(
        {
          success: false,
          message: activationResult?.message || "Failed to activate key"
        },
        { status: 400 }
      );
    }

    // Reset the Free-tier LIFETIME allowance on Pro activation so that a user who
    // upgrades and later lapses back to Free receives a fresh evaluation + MCQ test.
    // (See migration 019_free_lifetime_limits.sql)
    try {
      await supabase
        .from('free_lifetime_usage')
        .upsert(
          {
            user_id: supabaseUserId,
            eval_count: 0,
            mcq_count: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    } catch (resetErr) {
      // Non-fatal: activation already succeeded.
      console.error('Failed to reset free_lifetime_usage on pro activation:', resetErr);
    }

    // =====================================================
    // RENEWAL FUNCTIONALITY DISABLED
    // =====================================================
    // Only new activations are allowed (renewals are blocked above)
    // Return activation information (backward compatible format)
    return NextResponse.json({
      success: true,
      message: "Pro access activated successfully!",
      isRenewal: false,
      expiryDate: activationResult?.expiry_date || keyData.expiry_date,
      durationDays: activationResult?.duration_days || keyData.duration_days
    });

  } catch (error: any) {
    console.error("Error verifying pro key:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to verify key" },
      { status: 500 }
    );
  }
}
