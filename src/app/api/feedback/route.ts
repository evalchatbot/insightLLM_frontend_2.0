import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Feedback endpoint for the standalone build.
 *
 * Supabase is OPTIONAL here: if NEXT_PUBLIC_SUPABASE_URL + a key are configured
 * the feedback is persisted; otherwise it's logged server-side and the request
 * still succeeds. This keeps the app fully functional with zero Supabase setup.
 */
function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, user_email, page_url, feedback_type, subject, message, rating, user_agent } = body;

    if (!page_url || !feedback_type || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validTypes = ["bug", "feature", "improvement", "general"];
    if (!validTypes.includes(feedback_type)) {
      return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
    }

    if (rating !== null && rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      // No DB configured — accept and log so the UX still works.
      console.log("[feedback] (not persisted — no Supabase env):", {
        page_url,
        feedback_type,
        subject,
        message,
        rating: rating || null,
      });
      return NextResponse.json({ success: true, persisted: false }, { status: 201 });
    }

    const { data, error } = await supabase
      .from("feedback")
      .insert([
        {
          user_id: user_id || null,
          user_email: user_email || null,
          page_url,
          feedback_type,
          subject: String(subject).trim(),
          message: String(message).trim(),
          rating: rating || null,
          user_agent: user_agent || null,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to save feedback", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, persisted: true, data }, { status: 201 });
  } catch (error) {
    console.error("Error in feedback API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
