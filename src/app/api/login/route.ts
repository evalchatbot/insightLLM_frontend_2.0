import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, checkCredentials, getSessionToken } from "@/lib/auth";

/**
 * POST /api/login
 * Body: { username, password }
 * Sets an httpOnly session cookie on success. No external auth provider.
 */
export async function POST(req: NextRequest) {
  let username = "";
  let password = "";

  try {
    const body = await req.json();
    username = (body?.username ?? "").toString();
    password = (body?.password ?? "").toString();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  if (!checkCredentials(username, password)) {
    return NextResponse.json({ ok: false, message: "Invalid username or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE,
    value: getSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
