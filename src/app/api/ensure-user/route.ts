import { NextRequest, NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// Use Edge runtime; Clerk server helpers support it
export const runtime = "edge";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase env vars missing");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch Clerk user to reliably get email
    let email: string | null = null;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user?.emailAddresses?.[0]?.emailAddress ?? null;
      if (!email && (user as any)?.email) email = (user as any).email;
    } catch (e) {
      console.warn("ensure-user: failed to fetch Clerk user", e);
    }

    if (!email) {
      return NextResponse.json({ ok: false, error: "No email on user" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Try find existing user by email in public.users
    const { data: found, error: findErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (findErr) {
      // Postgrest returns error when zero rows with .single(); we use maybeSingle() to avoid throwing
      // But handle other errors here if any
      console.warn("ensure-user: lookup error", findErr);
    }

    if (found?.id) {
      return NextResponse.json({ ok: true, id: found.id, created: false });
    }

    // Ensure there is a Supabase Auth user so FK(id) -> auth.users(id) passes
    let authUserId: string | null = null;
    try {
      const { data: createdAuth, error: createAuthErr } = await (supabase as any).auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (createAuthErr) {
        // If the user already exists in Auth, fetch it
        const msg = String(createAuthErr.message || createAuthErr.error || "").toLowerCase();
        if (msg.includes("already") || msg.includes("exists") || (createAuthErr.status && createAuthErr.status === 422)) {
          try {
            const { data: listRes, error: listErr } = await (supabase as any).auth.admin.listUsers({ page: 1, perPage: 200 });
            if (listErr) throw listErr;
            const match = listRes?.users?.find((u: any) => (u.email || u?.user_metadata?.email) === email || u?.email === email);
            authUserId = match?.id ?? null;
          } catch (le) {
            console.warn("ensure-user: listUsers fallback failed", le);
          }
        } else {
          console.warn("ensure-user: createAuth error", createAuthErr);
        }
      } else {
        authUserId = createdAuth?.user?.id ?? null;
      }
    } catch (ae) {
      console.warn("ensure-user: auth admin exception", ae);
    }

    if (!authUserId) {
      // As a last resort, do another lookup in public.users in case of race
      const { data: again } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (again?.id) {
        return NextResponse.json({ ok: true, id: again.id, created: false });
      }
      return NextResponse.json({ ok: false, error: "Cannot ensure auth user for FK" }, { status: 500 });
    }

    // Insert minimal row with FK id from auth.users
    const { data: inserted, error: insertErr } = await supabase
      .from("users")
      .insert({ id: authUserId, email })
      .select("id")
      .single();

    if (insertErr) {
      // In case of unique violation race, re-read
      if (insertErr.code === "23505") {
        const { data: again } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .single();
        if (again?.id) return NextResponse.json({ ok: true, id: again.id, created: false });
      }
      console.error("ensure-user: insert error", insertErr);
      return NextResponse.json({ ok: false, error: "DB insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: inserted.id, created: true });
  } catch (e: any) {
    console.error("ensure-user error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
