import type { LanguageModel } from "ai";

import {
  convertToModelMessages,
  generateText,
  isToolUIPart,
  Output,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { z } from "zod";
import { formatLoreSections, queryLore } from "@/lib/ai/lore.server";
import type { PlanaChatMessage, PlanaStatusKey } from "@/lib/ai/message-types";
import type { getPlanaProvider } from "@/lib/ai/providers";
import {
  createPlanaTools,
  getActivePlanaTools,
} from "@/lib/ai/tools/index.server";
import { LORE_QUERY_PLANNER_PROMPT } from "./lore-classifier";
import { PLANA_CHARACTER_BIBLE } from "./plana";
import type { LoreContext } from "./story-search.server";

const PLANNER_HISTORY_MESSAGES = 6;
const PLANNER_ATTEMPT_TIMEOUT_MS = 4_000;
const PLANNER_TOTAL_TIMEOUT_MS = 7_000;
const TITLE_ATTEMPT_TIMEOUT_MS = 8_000;
const TITLE_TOTAL_TIMEOUT_MS = 20_000;
const MAX_CONTEXT_MESSAGES = 50;
const MAX_STEPS = 8;

// One CJK character at a time, since those texts have no spaces to split on.
const STREAM_CHUNKING = /[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]|\S+\s+/;

function formatContextForPrompt(context: LoreContext): string {
  if (context.summaries.length === 0 && context.passages.length === 0) {
    return "";
  }

  const sections = [
    `### CONTEXT & MEMORIES ###
These are your memories of what happened in Kivotos, each labelled with where it comes from. Use them to answer. The labels and the words "story" or "chapter" in them are only for your reference, so never repeat them to Sensei.
- The Main Story and Special Operations are the main plot. Event, Group, Mini and Bond stories are side stories and can be lighthearted, so don't present them as main plot events.
- "Sensei (choice N)" lines are options the player can pick, so don't state that Sensei said any particular one.
- If these memories don't cover what was asked, say that you don't remember it instead of guessing.`,
  ];

  sections.push(formatLoreSections(context));

  return sections.join("\n\n");
}

const loreQueryPlan = z.object({
  needsLoreContext: z.boolean(),
  question: z.string().nullish(),
  searchQueries: z.array(z.string()).nullish(),
});

/**
 * Runs a small background task on the cheap model, then on the chat model if
 * that fails. The cheap model is often rate limited upstream, while the chat
 * model is one the user has already chosen and is paying for.
 */
async function withChatModelFallback<T>(
  label: string,
  provider: PlanaProvider,
  run: (model: LanguageModel, abortSignal: AbortSignal) => Promise<T>,
  {
    abortSignal,
    attemptTimeoutMs,
    totalTimeoutMs,
  }: {
    abortSignal?: AbortSignal;
    attemptTimeoutMs: number;
    totalTimeoutMs: number;
  },
) {
  const deadline = AbortSignal.timeout(totalTimeoutMs);

  const shared = abortSignal
    ? AbortSignal.any([
        abortSignal,
        deadline,
      ])
    : deadline;

  try {
    return await run(
      provider.classifierModel,
      AbortSignal.any([
        shared,
        AbortSignal.timeout(attemptTimeoutMs),
      ]),
    );
  } catch (err) {
    if (shared.aborted) {
      throw err;
    }

    console.warn(`Plana ${label} falling back to the chat model`, err);
  }

  return await run(provider.chatModel, shared);
}

async function planLoreQuery(
  conversation: string,
  provider: PlanaProvider,
  abortSignal: AbortSignal | undefined,
) {
  // The lookup is optional, so a slow or failing planner must not cost the reply.
  try {
    return await withChatModelFallback(
      "lore planner",
      provider,
      async (model, signal) => {
        const { output } = await generateText({
          model,
          system: LORE_QUERY_PLANNER_PROMPT,
          prompt: conversation,
          maxRetries: 0,
          abortSignal: signal,
          output: Output.object({
            schema: loreQueryPlan,
          }),
        });

        return output;
      },
      {
        abortSignal,
        attemptTimeoutMs: PLANNER_ATTEMPT_TIMEOUT_MS,
        totalTimeoutMs: PLANNER_TOTAL_TIMEOUT_MS,
      },
    );
  } catch (err) {
    console.error("Plana lore planner failed", err);
    return null;
  }
}

function getTextFromMessage(message: PlanaChatMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function getLatestUserMessage(messages: PlanaChatMessage[]) {
  return [
    ...messages,
  ]
    .reverse()
    .find((message) => message.role === "user");
}

function formatPlannerConversation(messages: PlanaChatMessage[]) {
  return messages
    .slice(-PLANNER_HISTORY_MESSAGES)
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Plana"}: ${getTextFromMessage(message)}`,
    )
    .join("\n");
}

function hasAnsweredApproval(message: PlanaChatMessage) {
  return message.parts.some(
    (part) =>
      isToolUIPart(part) &&
      (part.state === "approval-responded" || part.state === "output-denied"),
  );
}

/**
 * Past turns go to the model as text. Only a reply being continued after an
 * approval keeps its tool parts, because the model has to resume that call.
 */
function toModelReadyMessages(messages: PlanaChatMessage[]) {
  const recent = messages.slice(-MAX_CONTEXT_MESSAGES);

  return recent.flatMap((message, index) => {
    const isContinuation =
      index === recent.length - 1 &&
      message.role === "assistant" &&
      hasAnsweredApproval(message);
    const parts = message.parts.filter(
      (part) =>
        part.type === "text" ||
        (isContinuation && (isToolUIPart(part) || part.type === "step-start")),
    );

    return parts.length > 0
      ? [
          {
            ...message,
            parts,
          },
        ]
      : [];
  });
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

export type PlanaProvider = Awaited<ReturnType<typeof getPlanaProvider>>;

export type PlanaResponseOptions = {
  abortSignal?: AbortSignal;
  provider: PlanaProvider;
  locale: "en" | "ja";
  onStatus?: (key: PlanaStatusKey) => void;
  senseiName?: string;
  timeZone?: string;
  userId: string;
};

export async function streamPlanaResponse(
  messages: PlanaChatMessage[],
  options: PlanaResponseOptions,
) {
  const { provider } = options;
  const latestUserMessage = getLatestUserMessage(messages);
  const userMessage = latestUserMessage
    ? getTextFromMessage(latestUserMessage)
    : "";

  if (!userMessage.trim()) {
    throw new Error("No user message provided");
  }

  const isContinuation = messages.at(-1)?.role === "assistant";
  const plan = isContinuation
    ? null
    : await planLoreQuery(
        formatPlannerConversation(messages),
        provider,
        options.abortSignal,
      );
  const queries = plan?.searchQueries?.length
    ? plan.searchQueries
    : plan?.question
      ? [
          plan.question,
        ]
      : [];
  const needsLore = !!plan?.needsLoreContext && queries.length > 0;

  if (needsLore) {
    options.onStatus?.("recalling");
  }

  const context = needsLore ? await queryLore(queries) : null;
  const formattedContext = context ? formatContextForPrompt(context) : "";
  const tools = createPlanaTools({
    locale: options.locale,
    userId: options.userId,
  });
  const modelMessages = await convertToModelMessages(
    toModelReadyMessages(messages),
    {
      tools,
    },
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
    tools,
    abortSignal: options.abortSignal,
    stopWhen: stepCountIs(MAX_STEPS),
    prepareStep: ({ stepNumber, steps }) => ({
      activeTools: getActivePlanaTools(tools, steps) as (keyof typeof tools)[],
      toolChoice: stepNumber >= MAX_STEPS - 1 ? "none" : undefined,
    }),
    experimental_transform: smoothStream({
      chunking: STREAM_CHUNKING,
      delayInMs: 12,
    }),
  });
}

export async function generatePlanaChatTitle(
  conversation: string,
  provider: PlanaProvider,
) {
  const text = await withChatModelFallback(
    "chat title",
    provider,
    async (model, abortSignal) => {
      const result = await generateText({
        model,
        system:
          "Write a title of at most 6 words for this conversation, in the language the user writes in. Reply with only the title, with no quotes, no ending punctuation and no mention of Plana or Sensei.",
        prompt: conversation,
        maxRetries: 0,
        abortSignal,
      });

      return result.text;
    },
    {
      attemptTimeoutMs: TITLE_ATTEMPT_TIMEOUT_MS,
      totalTimeoutMs: TITLE_TOTAL_TIMEOUT_MS,
    },
  );

  return text.trim().replace(/^["'「]|["'」]$/g, "");
}

export function formatConversationForTitle(
  messages: PlanaChatMessage[],
  reply: PlanaChatMessage,
) {
  return formatPlannerConversation([
    ...messages,
    reply,
  ]);
}
