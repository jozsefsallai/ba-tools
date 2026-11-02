import {
  MCP_RESOURCE_METADATA_PATH,
  verifyMcpToken,
} from "@/lib/mcp/auth.server";
import { registerMcpTools } from "@/lib/mcp/register-tools";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    registerMcpTools(server);
  },
  {
    serverInfo: {
      name: "ba-tools",
      version: "0.2.0",
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
    disableSse: true,
  },
);

const authHandler = withMcpAuth(handler, verifyMcpToken, {
  required: true,
  resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
});

export { authHandler as GET, authHandler as POST };
