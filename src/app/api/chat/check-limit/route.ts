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

    // Debug: Log what the database function returned
    console.log('🔍 check_usage_limit returned:', JSON.stringify(limitCheck, null, 2));
    console.log('🔍 Requested tokens:', { input_tokens, output_tokens });
    
    // CRITICAL: Check current usage status and FORCE block if at/near limit
    if (limitCheck?.usage) {
      console.log('📊 Current usage:', limitCheck.usage);
      const inputUsed = limitCheck.usage.tokens_input_used || 0;
      const outputUsed = limitCheck.usage.tokens_output_used || 0;
      const inputLimit = limitCheck.is_pro ? 1000000 : 250000;
      const outputLimit = limitCheck.is_pro ? 3000000 : 500000;
      const inputPercent = (inputUsed/inputLimit)*100;
      const outputPercent = (outputUsed/outputLimit)*100;
      
      console.log(`📊 Input: ${inputUsed}/${inputLimit} (${inputPercent.toFixed(1)}%)`);
      console.log(`📊 Output: ${outputUsed}/${outputLimit} (${outputPercent.toFixed(1)}%)`);
      
      // SAFETY CHECK: Force block if at 95% or higher OR would exceed with this request
      if (inputPercent >= 95 || outputPercent >= 95 || 
          inputUsed + input_tokens >= inputLimit || 
          outputUsed + output_tokens >= outputLimit) {
        console.log('🚫 FORCE BLOCKING - At or near limit!');
        
        const currentPeriod = new Date();
        currentPeriod.setDate(1);
        const currentPeriodStr = currentPeriod.toISOString().split('T')[0];
        let wasProUser = limitCheck.is_pro;
        
        // If pro user at 95%+, downgrade them to free
        if (limitCheck.is_pro) {
          console.log('⬇️ DOWNGRADING PRO USER to FREE at 95%+ usage');
          
          // Delete pro usage and keys
          await supabase.from('usage_pro').delete().eq('user_id', supUser.id);
          await supabase.from('keys').delete().eq('used_by', supUser.id);
          
          // Create fresh free usage record
          await supabase.from('usage_free').upsert({
            user_id: supUser.id,
            period_start: currentPeriodStr,
            tokens_input_used: 0,
            tokens_output_used: 0
          });
          
          console.log('✅ User downgraded to free with 0 usage');
        }
        
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        const message = wasProUser 
          ? `Pro plan token limit reached (${inputUsed.toLocaleString()}/${inputLimit.toLocaleString()} tokens used). You have been downgraded to Free plan with a fresh start. Your free usage will reset on ${nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
          : `Free plan token limit reached. You will be able to reuse the free version on ${nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} when it will be renewed. To continue using, upgrade to Pro.`;
        return NextResponse.json({
          success: false,
          can_proceed: false,
          message: message,
          is_pro: false, // Always false after downgrade
          downgraded: wasProUser ? true : false,
          usage: wasProUser ? { tokens_input_used: 0, tokens_output_used: 0, period_start: currentPeriodStr } : limitCheck.usage
        }, { status: 429 });
      }
    }

    // Check if limit check returned success: false OR can_proceed: false (limit exceeded)
    if (limitCheck && (!limitCheck.can_proceed || !limitCheck.success)) {
      console.log('🚫 BLOCKING REQUEST - Limit exceeded (from DB)');
      return NextResponse.json({ 
        success: false, 
        can_proceed: false,
        message: limitCheck.message || "Monthly token limit exceeded",
        is_pro: limitCheck.is_pro,
        downgraded: limitCheck.downgraded || false,
        usage: limitCheck.usage
      }, { status: 429 });
    }

    console.log('✅ ALLOWING REQUEST - Usage within limits');
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

