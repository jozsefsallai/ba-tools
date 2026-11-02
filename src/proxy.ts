import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

function isIntlExempt(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/mcp") ||
    pathname.startsWith("/developers") ||
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
    // - /api, /mcp, /developers (yaakdoc API docs), /_next, /_vercel
    // - any path with a dot (static files in public/, favicon, etc.)
    "/((?!api|mcp|developers|_next|_vercel|.*\\..*).*)",
    // Always run Clerk for API routes and the MCP server
    "/(api|trpc|mcp)(.*)",
    "/__clerk/(.*)",
  ],
};
