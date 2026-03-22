import { createMcpHandler } from "mcp-handler";
import { registerMcpTools } from "@/lib/mcp/register-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    registerMcpTools(server);
  },
  {
    serverInfo: {
      name: "ba-tools",
      version: "0.1.0",
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
    disableSse: true,
  },
);

export { handler as GET, handler as POST };
