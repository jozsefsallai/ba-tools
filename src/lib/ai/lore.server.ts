import "server-only";

import { getLoreCollections } from "./chroma";
import { type LoreContext, searchStories } from "./story-search.server";

function flattenDocuments(documents: (string | null)[][]) {
  return documents.flat().filter((document) => document !== null);
}

async function queryChroma(queries: string[]): Promise<LoreContext> {
  const { summaries, dialogues } = await getLoreCollections();

  const [summaryContext, dialogueContext] = await Promise.all([
    summaries.query({
      queryTexts: queries,
    }),
    dialogues.query({
      queryTexts: queries,
    }),
  ]);

  return {
    summaries: flattenDocuments(summaryContext.documents),
    passages: flattenDocuments(dialogueContext.documents),
  };
}

export async function queryLore(
  queries: string[],
): Promise<LoreContext | null> {
  try {
    return process.env.UPSTASH_VECTOR_REST_URL
      ? await searchStories(queries)
      : await queryChroma(queries);
  } catch (err) {
    console.error("Plana lore lookup failed", err);
    return null;
  }
}

export function formatLoreSections(context: LoreContext) {
  const sections: string[] = [];

  if (context.summaries.length > 0) {
    sections.push(`[SUMMARIES]\n${context.summaries.join("\n\n")}`);
  }

  if (context.passages.length > 0) {
    sections.push(`[STORY PASSAGES]\n${context.passages.join("\n\n")}`);
  }

  return sections.join("\n\n");
}
