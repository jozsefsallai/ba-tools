import { PLANA_CHARACTER_BIBLE } from "./plana";

import {
  Output,
  type UIMessage,
  convertToModelMessages,
  generateText,
  streamText,
} from "ai";
import { z } from "zod";
import { dialogueCollection, summaryCollection } from "./chroma";
import { LORE_CLASSIFIER_PROMPT } from "./lore-classifier";

import { getPlanaProvider } from "@/lib/ai/providers";
import type { LanguageModel } from "ai";

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
}>;
export async function getLoreClassifierResult(
  userMessage: string,
  classifierModel: LanguageModel,
): Promise<{
  needsLoreContext: boolean;
  question?: string | null;
}>;
export async function getLoreClassifierResult(
  userMessage: string,
  classifierModel?: LanguageModel,
): Promise<{
  needsLoreContext: boolean;
  question?: string | null;
}> {
  const model = classifierModel ?? (await getPlanaProvider()).classifierModel;
  const { output } = await generateText({
    model,
    system: LORE_CLASSIFIER_PROMPT,
    prompt: userMessage,
    output: Output.object({
      schema: z.object({
        needsLoreContext: z.boolean(),
        question: z.string().nullish(),
      }),
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
  return [...messages].reverse().find((message) => message.role === "user");
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
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
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

  const { needsLoreContext, question } = await getLoreClassifierResult(
    `Query addressed to Plana: ${userMessage}`,
    provider.classifierModel,
  );

  const context =
    needsLoreContext && !!question ? await queryVectorStores(question) : null;
  const formattedContext = context ? formatContextForPrompt(context) : "";

  const modelMessages = await convertToModelMessages(
    toTextOnlyMessages(messages),
  );

  const system = [
    PLANA_CHARACTER_BIBLE,
    formatSenseiIdentityPrompt(options.senseiName),
    formatCurrentDateTimePrompt({ timeZone: options.timeZone }),
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
