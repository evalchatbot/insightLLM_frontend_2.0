import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Run middleware for all app routes except static assets and _next internals
    // This regex excludes requests with file extensions (images, fonts, static) and _next paths
    "/((?!.+\\.[\\w]+$|_next).*)",
    // Also make sure the root and API routes are covered
    "/",
    "/(api)(.*)",
  ],
};

