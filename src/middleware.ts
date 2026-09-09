import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidSession } from "@/lib/auth";

/**
 * Hardcoded-login gate (replaces Clerk).
 *
 * Everything requires a valid session cookie EXCEPT the login page, the
 * login/logout API routes, and Next.js internal/static assets.
 */
const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Allow Next internals and static files (they are also excluded by matcher,
  // but keep this defensive check for any that slip through).
  if (pathname.startsWith("/_next") || pathname.startsWith("/assets")) return true;
  if (/\.[\w]+$/.test(pathname)) return true; // has a file extension
  return false;
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const session = req.cookies.get(AUTH_COOKIE)?.value;
  if (isValidSession(session)) return NextResponse.next();

  // Not authenticated -> send to login, remembering where they were headed.
  const url = new URL("/login", req.url);
  if (pathname && pathname !== "/") {
    url.searchParams.set("from", pathname);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Run on everything except Next internals and files with an extension.
    "/((?!_next|.*\\.[\\w]+$).*)",
  ],
};
