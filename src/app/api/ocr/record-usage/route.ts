import { NextResponse } from "next/server";

/**
 * Usage recording — DISABLED (no-op) in the standalone build.
 *
 * No per-user quotas here (single hardcoded login), so nothing is tracked.
 * Returns a shape the client is happy with and never triggers a downgrade.
 */
export async function POST() {
  return NextResponse.json({
    success: true,
    message: "unlimited",
    is_pro: true,
    was_pro: true,
    downgraded: false,
    ocr_count: 0,
    ocr_limit: null,
  });
}
