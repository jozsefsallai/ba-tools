import { db } from "@/lib/db";
import { jsonText } from "@/lib/mcp/json-text";
import { addStudentMediaUrlFieldsForMcp } from "@/lib/mcp/student-media-urls";
import { buildCDNAbsoluteUrl, buildItemIconUrl } from "@/lib/url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSearchGiftsTool(server: McpServer) {
  server.registerTool(
    "search_gifts",
    {
      title: "Search gifts",
      description:
        "Search gifts by name (EN or JP substring). Each gift includes `iconUrl` (CDN path). Adored / loved / liked student lists include `iconUrl` and `portraitUrl` per student.",
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
          iconName: true,
          isLovedByEveryone: true,
          adoredBy: { select: { id: true, name: true } },
          lovedBy: { select: { id: true, name: true } },
          likedBy: { select: { id: true, name: true } },
        },
      });

      const giftsForMcp = gifts.map((g) => ({
        ...g,
        iconUrl: buildCDNAbsoluteUrl(
          buildItemIconUrl(g.iconName).replace("/cdn/", ""),
        ),
        adoredBy: g.adoredBy.map((s) =>
          addStudentMediaUrlFieldsForMcp({ ...s } as Record<string, unknown>),
        ),
        lovedBy: g.lovedBy.map((s) =>
          addStudentMediaUrlFieldsForMcp({ ...s } as Record<string, unknown>),
        ),
        likedBy: g.likedBy.map((s) =>
          addStudentMediaUrlFieldsForMcp({ ...s } as Record<string, unknown>),
        ),
      }));

      return {
        content: [
          {
            type: "text",
            text:
              gifts.length === 0
                ? "No gifts matched the query."
                : jsonText(giftsForMcp),
          },
        ],
      };
    },
  );
}
