import type { LanguageModel } from "ai";

import {
  convertToModelMessages,
  generateText,
  Output,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getPlanaProvider } from "@/lib/ai/providers";
import { getLoreCollections } from "./chroma";
import { LORE_QUERY_PLANNER_PROMPT } from "./lore-classifier";
import { PLANA_CHARACTER_BIBLE } from "./plana";
import { type LoreContext, searchStories } from "./story-search.server";

const PLANNER_HISTORY_MESSAGES = 6;

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

async function queryLore(queries: string[]): Promise<LoreContext | null> {
  try {
    return process.env.UPSTASH_VECTOR_REST_URL
      ? await searchStories(queries)
      : await queryChroma(queries);
  } catch (err) {
    console.error("Plana lore lookup failed", err);
    return null;
  }
}

function formatContextForPrompt(context: LoreContext): string {
  if (context.summaries.length === 0 && context.passages.length === 0) {
    return "";
  }

  const sections = [
    `### CONTEXT & MEMORIES ###
These are your memories of the story, each labelled with where it comes from. Use them to answer.
- The Main Story and Special Operations are the main plot. Event, Group, Mini and Bond stories are side stories and can be lighthearted, so don't present them as main plot events.
- "Sensei (choice N)" lines are options the player can pick, so don't state that Sensei said any particular one.
- If these memories don't cover what was asked, say that you don't remember it instead of guessing.`,
  ];

  if (context.summaries.length > 0) {
    sections.push(`[SUMMARIES]\n${context.summaries.join("\n\n")}`);
  }

  if (context.passages.length > 0) {
    sections.push(`[STORY PASSAGES]\n${context.passages.join("\n\n")}`);
  }

  return sections.join("\n\n");
}

const loreQueryPlan = z.object({
  needsLoreContext: z.boolean(),
  question: z.string().nullish(),
  searchQueries: z.array(z.string()).nullish(),
});

export async function planLoreQuery(
  conversation: string,
  plannerModel: LanguageModel,
) {
  const { output } = await generateText({
    model: plannerModel,
    system: LORE_QUERY_PLANNER_PROMPT,
    prompt: conversation,
    output: Output.object({
      schema: loreQueryPlan,
    }),
  });

  return output;
}

function getTextFromMessage(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function getLatestUserMessage(messages: UIMessage[]) {
  return [
    ...messages,
  ]
    .reverse()
    .find((message) => message.role === "user");
}

function formatPlannerConversation(messages: UIMessage[]) {
  return messages
    .slice(-PLANNER_HISTORY_MESSAGES)
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Plana"}: ${getTextFromMessage(message)}`,
    )
    .join("\n");
}

function toTextOnlyMessages(messages: UIMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    parts: message.parts.filter((part) => part.type === "text"),
  }));
}

function formatSenseiIdentityPrompt(name: string | undefined) {
  if (!name) {
    return "";
  }

  return `### SENSEI IDENTITY ###
The user's display name is ${JSON.stringify(name)}.
Address them as "${name} Sensei" instead of only "Sensei" when speaking to them.`;
}

function getSafeTimeZone(timeZone: string | undefined) {
  if (!timeZone) {
    return "UTC";
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone,
    }).format();
    return timeZone;
  } catch {
    return "UTC";
  }
}

function formatCurrentDateTimePrompt({
  date = new Date(),
  timeZone,
}: {
  date?: Date;
  timeZone?: string;
} = {}) {
  const safeTimeZone = getSafeTimeZone(timeZone);

  return `### CURRENT DATE & TIME ###
Current date: ${new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: safeTimeZone,
  }).format(date)}
Current time: ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: safeTimeZone,
    timeZoneName: "short",
  }).format(date)}
Day of week: ${new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone,
    weekday: "long",
  }).format(date)}
User time zone: ${safeTimeZone}
Use this when Sensei asks about the date, time, schedule, greetings, or time-sensitive context.`;
}

export async function streamPlanaResponse(
  messages: UIMessage[],
  options: {
    senseiName?: string;
    timeZone?: string;
  } = {},
) {
  const provider = await getPlanaProvider();
  const latestUserMessage = getLatestUserMessage(messages);
  const userMessage = latestUserMessage
    ? getTextFromMessage(latestUserMessage)
    : "";

  if (!userMessage.trim()) {
    throw new Error("No user message provided");
  }

  const { needsLoreContext, question, searchQueries } = await planLoreQuery(
    formatPlannerConversation(messages),
    provider.classifierModel,
  );

  const queries = searchQueries?.length
    ? searchQueries
    : question
      ? [
          question,
        ]
      : [];
  const context =
    needsLoreContext && queries.length > 0 ? await queryLore(queries) : null;
  const formattedContext = context ? formatContextForPrompt(context) : "";

  const modelMessages = await convertToModelMessages(
    toTextOnlyMessages(messages),
  );

  const system = [
    PLANA_CHARACTER_BIBLE,
    formatSenseiIdentityPrompt(options.senseiName),
    formatCurrentDateTimePrompt({
      timeZone: options.timeZone,
    }),
    formattedContext,
  ]
    .filter(Boolean)
    .join("\n\n");

  return streamText({
    model: provider.chatModel,
    system,
    messages: modelMessages,
  });
}
