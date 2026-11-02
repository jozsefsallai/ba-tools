import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

export const MCP_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource/mcp";

export function clerkIssuer() {
  const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
  if (!issuer) {
    throw new Error("CLERK_JWT_ISSUER_DOMAIN is not set.");
  }

  return issuer.replace(/\/+$/, "");
}

export async function verifyMcpToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) {
    return undefined;
  }

  const result = await auth({
    acceptsToken: "oauth_token",
  });
  if (!result.isAuthenticated || !result.userId.startsWith("user_")) {
    return undefined;
  }

  return {
    token: bearerToken,
    clientId: result.clientId,
    scopes: result.scopes,
    extra: {
      userId: result.userId,
    },
  };
}

export function mcpUserId(authInfo: AuthInfo | undefined) {
  const userId = authInfo?.extra?.userId;
  return typeof userId === "string" ? userId : undefined;
}
