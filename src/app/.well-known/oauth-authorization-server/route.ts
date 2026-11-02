import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { clerkIssuer } from "@/lib/mcp/auth.server";

export async function GET() {
  const response = await fetch(
    `${clerkIssuer()}/.well-known/oauth-authorization-server`,
    {
      cache: "no-store",
    },
  );

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
