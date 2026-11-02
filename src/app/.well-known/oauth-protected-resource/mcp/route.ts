import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { clerkIssuer } from "@/lib/mcp/auth.server";

export function GET(req: Request) {
  return protectedResourceHandler({
    authServerUrls: [
      clerkIssuer(),
    ],
  })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
