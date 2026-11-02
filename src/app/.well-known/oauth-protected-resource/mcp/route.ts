import { clerkIssuer } from "@/lib/mcp/auth.server";
import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

export function GET(req: Request) {
  return protectedResourceHandler({ authServerUrls: [clerkIssuer()] })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
