import { createClient } from '@supabase/supabase-js';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
  // Read auth from the incoming request — cast to any to satisfy type expectations
  const { userId } = getAuth((req as any) as any);
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    // Get Clerk user to extract email (clerkClient is async factory)
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
    }

    if (!userEmail) return NextResponse.json({ success: false, message: 'No email for user' }, { status: 400 });

    // Find supabase user by email
    const { data: supUser, error: supUserErr } = await supabase
      .from('users')
      .select('id,email')
      .eq('email', userEmail)
      .single();

    if (supUserErr || !supUser) return NextResponse.json({ success: false, message: 'No matching supabase user' }, { status: 404 });

    // Find active subscription
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('id, user_id, key_id, start_date, end_date, is_active')
      .eq('user_id', supUser.id)
      .eq('is_active', true)
      .single();

    if (subErr || !sub) return NextResponse.json({ success: true, hasAccess: false });

    // If subscription expired, mark inactive
    const now = new Date();
    const end = new Date(sub.end_date);
    if (end <= now) {
      // expire the subscription
      await supabase.from('subscriptions').update({ is_active: false }).eq('id', sub.id);
      return NextResponse.json({ success: true, hasAccess: false });
    }

    // compute days left
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return NextResponse.json({ success: true, hasAccess: true, daysLeft, end_date: sub.end_date });
  } catch (err) {
    console.error('Error in pro status route', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
