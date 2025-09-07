import { PLANA_CHARACTER_BIBLE } from "./plana";

import { generateObject } from "ai";
import { dialogueCollection, summaryCollection } from "./chroma";
import { LORE_CLASSIFIER_PROMPT } from "./lore-classifier";
import { z } from "zod";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type PlanaExpression, planaExpressions } from "@/lib/plana";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function queryVectorStores(query: string) {
  const summaryContext = await summaryCollection.query({
    queryTexts: [query],
  });

  const dialogueContext = await dialogueCollection.query({
    queryTexts: [query],
  });

  return {
    summaryContext: summaryContext.documents.join("\n"),
    dialogueContext: dialogueContext.documents.join("\n"),
  };
}

async function generateLlmResponse(
  system: string,
  prompt: string,
): Promise<{
  message: string;
  expression: PlanaExpression;
}> {
  const { object } = await generateObject({
    model: openrouter("deepseek/deepseek-chat-v3-0324"),
    system,
    prompt,
    schema: z.object({
      message: z.string(),
      expression: planaExpressions,
    }),
  });

  return object;
}

function formatContextForPrompt(context: {
  summaryContext: string;
  dialogueContext: string;
}): string {
  let formattedContext = "### CONTEXT & MEMORIES ###\n";

  formattedContext +=
    "Use the following information to construct your answer. The 'Summary' is an objective memory of what happened. The 'Dialogue' is a specific memory of a conversation.\n\n";

  if (context.summaryContext) {
    formattedContext += `[CONTEXT FROM SUMMARIES]\n- ${context.summaryContext}\n\n`;
  }

  if (context.dialogueContext) {
    formattedContext += `[CONTEXT FROM DIALOGUE]\n- ${context.dialogueContext}\n`;
  }
  return formattedContext;
}

export async function getLoreClassifierResult(userMessage: string): Promise<{
  needsLoreContext: boolean;
  question?: string | null;
}> {
  const { object } = await generateObject({
    model: openrouter("deepseek/deepseek-chat-v3-0324"),
    system: LORE_CLASSIFIER_PROMPT,
    prompt: userMessage,
    schema: z.object({
      needsLoreContext: z.boolean(),
      question: z.string().nullish(),
    }),
  });

  return object;
}

export async function getPlanaResponse(
  userMessage: string,
  conversationHistory = "",
) {
  const { needsLoreContext, question } = await getLoreClassifierResult(
    `Query addressed to Plana: ${userMessage}`,
  );

  const context =
    needsLoreContext && !!question ? await queryVectorStores(question) : null;
  const formattedContext = context ? formatContextForPrompt(context) : null;

  const basePrompt = `### CONVERSATION HISTORY ###
${conversationHistory}
Sensei: ${userMessage}
Plana:
`;

  if (!formattedContext) {
    return await generateLlmResponse(PLANA_CHARACTER_BIBLE, basePrompt);
  }

  const finalPrompt = `
${formattedContext}

${basePrompt}`;

  return await generateLlmResponse(PLANA_CHARACTER_BIBLE, finalPrompt);
}
