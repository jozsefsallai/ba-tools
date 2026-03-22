import { db } from "@/lib/db";
import { jsonText } from "@/lib/mcp/json-text";
import { mapStudentDeepEnumsToEn } from "@/lib/mcp/student-enum-labels-en";
import { findStudentIdsMatchingSearchTags } from "@/lib/mcp/student-ids-by-search-tags";
import { orderStudentsByFuzzyNameQuery } from "@/lib/student-search-query";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerGetStudentTool(server: McpServer) {
  server.registerTool(
    "get_student",
    {
      title: "Get student details",
      description:
        "Load one student by exact id or by nameQuery (display/dev/first/last name contains, case-insensitive, plus searchTags substring match after normalizing to lowercase alphanumerics), including skills and gift preferences.",
      inputSchema: {
        id: z
          .string()
          .optional()
          .describe("Exact student id (e.g. from search_students)"),
        nameQuery: z
          .string()
          .optional()
          .describe(
            "Match display name, devName, or searchTags (e.g. imari); uses findFirst if multiple match",
          ),
      },
    },
    async (args) => {
      const { id, nameQuery } = args;
      if (!id && !nameQuery?.trim()) {
        return {
          content: [
            {
              type: "text",
              text: "Error: provide either id or nameQuery.",
            },
          ],
          isError: true,
        };
      }

      const include = {
        skills: { orderBy: { id: "asc" as const } },
        giftsAdored: { select: { id: true, name: true, rarity: true } },
        giftsLoved: { select: { id: true, name: true, rarity: true } },
        giftsLiked: { select: { id: true, name: true, rarity: true } },
      } as const;

      let student = null;
      if (id) {
        student = await db.student.findUnique({
          where: { id },
          include,
        });
      } else if (nameQuery?.trim()) {
        const q = nameQuery.trim();

        const fuzzyCandidates = await db.student.findMany({
          orderBy: { defaultOrder: "asc" },
          select: { id: true, name: true, searchTags: true },
        });

        const { ordered } = orderStudentsByFuzzyNameQuery(fuzzyCandidates, q);
        const bestId = ordered[0]?.id;

        if (bestId) {
          student = await db.student.findUnique({
            where: { id: bestId },
            include,
          });
        } else {
          const tagIds = await findStudentIdsMatchingSearchTags(q);
          student = await db.student.findFirst({
            where: {
              OR: [
                { name: { equals: q, mode: "insensitive" as const } },
                { devName: { equals: q, mode: "insensitive" as const } },
                { name: { contains: q, mode: "insensitive" as const } },
                { devName: { contains: q, mode: "insensitive" as const } },
                { firstName: { contains: q, mode: "insensitive" as const } },
                { lastName: { contains: q, mode: "insensitive" as const } },
                ...(tagIds.length > 0 ? [{ id: { in: tagIds } }] : []),
              ],
            },
            orderBy: { defaultOrder: "asc" },
            include,
          });
        }
      }

      if (!student) {
        return {
          content: [
            {
              type: "text",
              text: "No student found for the given id or nameQuery.",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: jsonText(
              mapStudentDeepEnumsToEn({ ...student } as Record<
                string,
                unknown
              >),
            ),
          },
        ],
      };
    },
  );
}
