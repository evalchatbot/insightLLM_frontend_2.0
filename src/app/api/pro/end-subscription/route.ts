import { NextResponse } from 'next/server';

// End-subscription functionality has been disabled. This route intentionally returns
// 410 Gone to indicate the feature is removed.
export async function POST() {
  return NextResponse.json({ success: false, message: 'End-subscription feature disabled' }, { status: 410 });
}
