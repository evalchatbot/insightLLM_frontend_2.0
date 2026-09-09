import { NextResponse } from "next/server";

/**
 * Usage-limit check — DISABLED in the standalone build.
 *
 * The original app gated evaluations per Clerk user via Supabase. This build
 * has a single hardcoded login and no per-user quotas, so this always allows.
 */
export async function POST() {
  return NextResponse.json({
    success: true,
    can_proceed: true,
    message: "unlimited",
    is_pro: true,
    ocr_count: 0,
    ocr_limit: null,
  });
}
