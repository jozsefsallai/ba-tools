import { auth, currentUser } from "@clerk/nextjs/server";
import {
  consumeStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { after, type NextRequest } from "next/server";
import { stripPlanaMetadata } from "@/app/[locale]/plana-ai/_components/message-utils";
import { getSenseiDisplayName } from "@/app/[locale]/plana-ai/_lib/sensei-name";
import {
  formatConversationForTitle,
  generatePlanaChatTitle,
  streamPlanaResponse,
} from "@/lib/ai/chat";
import { classifyPlanaError } from "@/lib/ai/errors";
import type { PlanaChatMessage, PlanaSavedTool } from "@/lib/ai/message-types";
import { canAccessPlanaAi } from "@/lib/ai/plana-access";
import { getPlanaProvider, PlanaNotConfiguredError } from "@/lib/ai/providers";
import { isPlanaToolPart, toolPartToSaved } from "@/lib/ai/tool-parts";
import { userMutation, userQuery } from "@/lib/public-api/convex.server";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export const runtime = "nodejs";

type ChatRequest = {
  chatId?: Id<"planaChat">;
  locale?: string;
  messages?: PlanaChatMessage[];
  timeZone?: string;
  turnOrder?: number;
};

type StoredPart =
  | {
      type: "text";
      text: string;
    }
  | ({
      type: "tool";
    } & PlanaSavedTool);

function toStoredParts(message: PlanaChatMessage) {
  return message.parts.flatMap((part): StoredPart[] => {
    if (part.type === "text") {
      return stripPlanaMetadata(part.text).trim()
        ? [
            {
              type: "text",
              text: part.text,
            },
          ]
        : [];
    }

    if (part.type === "data-savedTool") {
      return [
        {
          type: "tool",
          ...part.data,
        },
      ];
    }

    return isPlanaToolPart(part)
      ? [
          {
            type: "tool",
            ...toolPartToSaved(part),
          },
        ]
      : [];
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!canAccessPlanaAi(user)) {
      return new Response("Plana AI is disabled", {
        status: 503,
      });
    }

    const { userId } = await auth();

    if (!userId) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    const { chatId, locale, messages, timeZone, turnOrder } =
      (await req.json()) as ChatRequest;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid messages", {
        status: 400,
      });
    }

    if (chatId) {
      await userQuery(userId, api.planaChat.assertChatOwner, {
        chatId,
      });
    }

    const provider = await getPlanaProvider();
    const senseiName = getSenseiDisplayName(user);
    let markFinished = () => {};
    const finished = new Promise<void>((resolve) => {
      markFinished = resolve;
    });

    after(() => finished);

    const stream = createUIMessageStream<PlanaChatMessage>({
      originalMessages: messages,
      onError: classifyPlanaError,
      execute: async ({ writer }) => {
        const result = await streamPlanaResponse(messages, {
          abortSignal: req.signal,
          locale: locale === "ja" ? "ja" : "en",
          onStatus: (key) => {
            writer.write({
              type: "data-status",
              data: {
                key,
              },
              transient: true,
            });
          },
          provider,
          senseiName,
          timeZone,
          userId,
        });

        writer.merge(
          result.toUIMessageStream<PlanaChatMessage>({
            onError: classifyPlanaError,
          }),
        );
      },
      onFinish: async ({ responseMessage }) => {
        try {
          const parts = toStoredParts(responseMessage);

          if (!chatId || turnOrder === undefined || parts.length === 0) {
            return;
          }

          const { isFirstReply } = await userMutation(
            userId,
            api.planaChat.completeAssistantVariant,
            {
              chatId,
              turnOrder,
              clientId: responseMessage.id,
              parts,
            },
          );

          if (isFirstReply) {
            try {
              const title = await generatePlanaChatTitle(
                formatConversationForTitle(messages, responseMessage),
                provider,
              );

              await userMutation(userId, api.planaChat.setGeneratedTitle, {
                chatId,
                title,
              });
            } catch (error) {
              console.error("Failed to generate Plana AI chat title:", error);
            }
          }
        } catch (error) {
          console.error("Failed to save Plana AI reply:", error);
        } finally {
          markFinished();
        }
      },
    });

    return createUIMessageStreamResponse({
      stream,
      consumeSseStream: consumeStream,
    });
  } catch (error) {
    if (error instanceof PlanaNotConfiguredError) {
      return new Response("not_configured", {
        status: 503,
      });
    }

    console.error("Error streaming Plana AI response:", error);
    return new Response("generic", {
      status: 500,
    });
  }
}
