import { createClient } from '@supabase/supabase-js';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Initialize Supabase with service role key for admin operations
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

export async function GET(req: Request) {
  try {
  // Read auth from the incoming request — cast to any to satisfy type expectations
  const { userId } = getAuth((req as any) as any);
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    // Get Clerk user to extract email (clerkClient is async factory)
    // Retry logic for transient Clerk API failures
    let userEmail: string | null = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries && !userEmail) {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        if (clerkUser?.emailAddresses && clerkUser.emailAddresses.length > 0) {
          userEmail = clerkUser.emailAddresses[0].emailAddress;
        } else if ((clerkUser as any)?.email) {
          userEmail = (clerkUser as any).email;
        }
        break; // Success, exit retry loop
      } catch (e: any) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.error('Failed to fetch Clerk user after retries:', e);
          // Return graceful error instead of crashing
          return NextResponse.json({ 
            success: false, 
            message: 'Temporary authentication service issue. Please try again in a moment.',
            retry: true
          }, { status: 503 }); // 503 Service Unavailable
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
      }
    }

    if (!userEmail) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unable to fetch user information. Please refresh the page.',
        retry: true
      }, { status: 503 });
    }

    // Find supabase user by email
    const { data: supUser, error: supUserErr } = await supabase
      .from('users')
      .select('id,email')
      .eq('email', userEmail)
      .single();

    if (supUserErr || !supUser) return NextResponse.json({ success: false, message: 'No matching supabase user' }, { status: 404 });

    // Check if user has an active pro key (not expired)
    const { data: keyData, error: keyError } = await supabase
      .from("keys")
      .select("expiry_date, duration_days")
      .eq("used_by", supUser.id)
      .eq("is_used", true)
      .gt("expiry_date", new Date().toISOString())
      .order("expiry_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check pro status and get current usage via record_usage function
    // Call with 0 tokens to just check status without recording usage
    const { data: usageData, error: usageError } = await supabase
      .rpc('record_usage', {
        p_user_id: supUser.id,
        p_input_tokens: 0,
        p_output_tokens: 0
      });

    if (usageError) {
      console.error('Error getting usage data:', usageError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to retrieve usage data' 
      }, { status: 500 });
    }

    // Use is_pro from record_usage (this checks if user has exceeded limits)
    // If user exceeded limits, record_usage returns is_pro: false even if they have an active key
    const isPro = usageData?.is_pro ?? false;
    const usage = usageData?.usage;
    const downgraded = usageData?.downgraded ?? false;

    // If user was downgraded OR is_pro is false, ensure we use free limits
    // This handles the case where user exceeded limits and was downgraded
    const finalIsPro = (downgraded || !isPro) ? false : isPro;

    // Set correct usage limits based on user type
    const limits = finalIsPro ? {
      input_tokens: 1000000,    // 1M tokens for Pro
      output_tokens: 3000000    // 3M tokens for Pro
    } : {
      input_tokens: 250000,     // 0.25M tokens for Free
      output_tokens: 500000     // 0.5M tokens for Free
    };

    // Calculate days left for pro access if user is pro
    let daysLeft = 0;
    if (finalIsPro && keyData) {
      const expiryDate = new Date(keyData.expiry_date);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Return response based on pro status
    return NextResponse.json({
      success: true,
      hasAccess: finalIsPro,
      isPro: finalIsPro,
      downgraded: downgraded,
      daysLeft: finalIsPro ? daysLeft : undefined,
      end_date: finalIsPro && keyData ? keyData.expiry_date : undefined,
      usage: usage
        ? {
            tokens_input: usage.tokens_input_used,
            tokens_output: usage.tokens_output_used,
            period_start: usage.period_start,
          }
        : null,
      limits
    });
  } catch (err) {
    console.error('Error in pro status route', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
