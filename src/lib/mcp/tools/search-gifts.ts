import { db } from "@/lib/db";
import { jsonText } from "@/lib/mcp/json-text";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSearchGiftsTool(server: McpServer) {
  server.registerTool(
    "search_gifts",
    {
      title: "Search gifts",
      description:
        "Search gifts by name (EN or JP substring). Returns adored / loved / liked student lists per gift.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Substring to match against gift name or nameJP"),
        limit: z.number().int().min(1).max(50).optional().default(25),
      },
    },
    async (args) => {
      const { query, limit } = args;

      const q = query.trim();
      const gifts = await db.gift.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { nameJP: { contains: q, mode: "insensitive" as const } },
          ],
        },
        take: limit,
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          nameJP: true,
          rarity: true,
          expValue: true,
          isLovedByEveryone: true,
          adoredBy: { select: { id: true, name: true } },
          lovedBy: { select: { id: true, name: true } },
          likedBy: { select: { id: true, name: true } },
        },
      });

      return {
        content: [
          {
            type: "text",
            text:
              gifts.length === 0
                ? "No gifts matched the query."
                : jsonText(gifts),
          },
        ],
      };
    },
  );
}
