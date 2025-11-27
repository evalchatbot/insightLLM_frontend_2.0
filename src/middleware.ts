import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes for signed-out users
const isPublicRoute = createRouteMatcher([
  "/",
  "/api/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)"
]);

// Protect all other routes by redirecting to sign-in
export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  try {
    const a = await (auth as any)();
    if (!a?.userId) {
      const url = new URL("/", req.url);
      url.searchParams.set("auth", "required");
      url.searchParams.set("from", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  } catch {
    const url = new URL("/", req.url);
    url.searchParams.set("auth", "required");
    url.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api)(.*)",
  ],
};

