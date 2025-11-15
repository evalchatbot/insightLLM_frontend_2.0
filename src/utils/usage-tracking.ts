import { type NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function trackUsage(req: NextRequest, userId: string, inputTokens: number = 0, outputTokens: number = 0) {
  try {
    // Get Clerk user to extract email
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
      console.warn('Failed to fetch Clerk user', e);
      return false;
    }

    if (!userEmail) {
      console.error('No email found for user');
      return false;
    }

    // Find supabase user by email, create if missing
    let supUserId: string | null = null;
    {
      const { data: supUser, error: supUserError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (supUser?.id) {
        supUserId = supUser.id as string;
      } else {
        // Create minimal user row by email
        const { data: inserted, error: insertErr } = await supabase
          .from('users')
          .insert({ email: userEmail })
          .select('id')
          .single();

        if (insertErr) {
          // If unique violation due to race, re-read
          if ((insertErr as any).code === '23505') {
            const { data: again } = await supabase
              .from('users')
              .select('id')
              .eq('email', userEmail)
              .single();
            supUserId = (again as any)?.id ?? null;
          } else {
            console.error('Failed to create Supabase user:', insertErr);
            return false;
          }
        } else {
          supUserId = (inserted as any)?.id ?? null;
        }
      }
    }

    // Track usage using the track_usage function
    const { data: usageResult, error: usageError } = await supabase
      .rpc('track_usage', {
        p_user_id: supUserId,
        p_input_tokens: inputTokens,
        p_output_tokens: outputTokens
      });

    if (usageError) {
      console.error('Failed to track usage:', usageError);
      return false;
    }

    return usageResult.success;
  } catch (error) {
    console.error('Error tracking usage:', error);
    return false;
  }
}