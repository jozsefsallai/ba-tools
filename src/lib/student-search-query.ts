import { commandScore } from "@/lib/text-score";

export const STUDENT_FUZZY_SCORE_THRESHOLD = 0.15;

export function swapStudentSearchQueryOnFirstSpace(
  query: string,
): string | null {
  const t = query.trim();
  const i = t.indexOf(" ");

  if (i <= 0 || i >= t.length - 1) {
    return null;
  }

  const first = t.slice(0, i).trim();
  const rest = t.slice(i + 1).trim();

  if (!first || !rest) {
    return null;
  }

  const swapped = `${rest} ${first}`;
  if (swapped === t) {
    return null;
  }

  return swapped;
}

export function orderStudentsByFuzzyNameQuery<
  T extends { id: string; name: string; searchTags: string[] },
>(
  candidates: T[],
  searchInput: string,
  scoreThreshold = STUDENT_FUZZY_SCORE_THRESHOLD,
): {
  ordered: T[];
  primaryScores: Map<string, number>;
  secondaryScores: Map<string, number>;
} {
  const trimmed = searchInput.trim();
  const scoreQuery = (s: T, q: string) => commandScore(s.name, q, s.searchTags);

  const primaryScores = new Map<string, number>();
  const primary = candidates
    .filter((s) => {
      const score = scoreQuery(s, trimmed);
      if (score > scoreThreshold) {
        primaryScores.set(s.id, score);
        return true;
      }
      return false;
    })
    .sort((a, b) => {
      const scoreA = primaryScores.get(a.id) ?? 0;
      const scoreB = primaryScores.get(b.id) ?? 0;
      if (scoreA === scoreB) {
        return a.name.localeCompare(b.name);
      }
      return scoreB - scoreA;
    });

  const primaryIds = new Set(primary.map((s) => s.id));
  const swappedQuery = swapStudentSearchQueryOnFirstSpace(trimmed);
  const secondaryScores = new Map<string, number>();
  const secondary =
    swappedQuery != null
      ? candidates
          .filter((s) => !primaryIds.has(s.id))
          .filter((s) => {
            const score = scoreQuery(s, swappedQuery);
            if (score > scoreThreshold) {
              secondaryScores.set(s.id, score);
              return true;
            }
            return false;
          })
          .sort((a, b) => {
            const scoreA = secondaryScores.get(a.id) ?? 0;
            const scoreB = secondaryScores.get(b.id) ?? 0;
            if (scoreA === scoreB) {
              return a.name.localeCompare(b.name);
            }
            return scoreB - scoreA;
          })
      : [];

  return {
    ordered: [...primary, ...secondary],
    primaryScores,
    secondaryScores,
  };
}
