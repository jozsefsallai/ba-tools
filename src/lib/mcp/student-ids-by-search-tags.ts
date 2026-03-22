import { db } from "@/lib/db";

/**
 * Normalizes free text the same way search tags are stored: lowercase, letters and digits only
 * (e.g. "I.Mari" / "Idol Mari" → "imari").
 */
export function normalizeStudentTextForTagMatch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Student ids where at least one `searchTags` entry contains `normalizedQuery` as a substring
 * (case-insensitive on the tag).
 */
export async function findStudentIdsMatchingSearchTags(
  rawQuery: string,
): Promise<string[]> {
  const needle = normalizeStudentTextForTagMatch(rawQuery);
  if (!needle) {
    return [];
  }

  const rows = await db.student.findMany({
    where: {
      searchTags: {
        has: needle,
      },
    },
    select: {
      id: true,
    },
  });

  return rows.map((r) => r.id);
}
