import { routing } from "@/i18n/routing";
import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

function isIntlExempt(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/mcp") ||
    pathname.startsWith("/__clerk") ||
    // Static files from `public/` (e.g. /wasm/main.wasm, /assets/.../*.ogg)
    pathname.includes(".")
  );
}

export default clerkMiddleware(async (_auth, req) => {
  if (isIntlExempt(req)) {
    return;
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: [
    // Match pages, but skip:
    // - /api, /mcp, /_next, /_vercel
    // - any path with a dot (static files in public/, favicon, etc.)
    "/((?!api|mcp|_next|_vercel|.*\\..*).*)",
    // Always run Clerk for API routes
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
