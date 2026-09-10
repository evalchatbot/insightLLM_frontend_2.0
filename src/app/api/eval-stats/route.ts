import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin-app evaluation counters (per subject + total).
 *
 * Writes to the isolated `admin_eval_stats` table via the service-role key.
 * If Supabase env is not configured yet, every call is a graceful no-op so the
 * app keeps working — you just won't see counts until env + the table exist.
 *
 * Requires (server-only env):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * and this SQL run once in Supabase:
 *   create table admin_eval_stats (subject text primary key, label text,
 *     count int not null default 0, updated_at timestamptz not null default now());
 *   + function increment_admin_eval(p_subject text, p_label text)
 */
function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch {
    return null;
  }
}

// POST { subject, label? } — increment the counter for a subject (called at submit).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const subject = (body?.subject ?? "").toString().trim();
    const label = body?.label ? String(body.label) : null;
    if (!subject) {
      return NextResponse.json({ ok: false, message: "subject is required" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ ok: true, skipped: true }); // stats disabled

    const { error } = await supabase.rpc("increment_admin_eval", { p_subject: subject, p_label: label });
    if (error) {
      console.error("[eval-stats] increment failed:", error.message);
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "error" }, { status: 500 });
  }
}

// GET — per-subject counts + total.
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ total: 0, subjects: [], configured: false });

  const { data, error } = await supabase
    .from("admin_eval_stats")
    .select("subject,label,count")
    .order("count", { ascending: false });

  if (error) {
    console.error("[eval-stats] read failed:", error.message);
    return NextResponse.json({ total: 0, subjects: [], configured: true, error: error.message });
  }

  const subjects = data || [];
  const total = subjects.reduce((sum: number, r: any) => sum + (Number(r.count) || 0), 0);
  return NextResponse.json({ total, subjects, configured: true });
}
