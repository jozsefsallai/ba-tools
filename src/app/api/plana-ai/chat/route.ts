import { streamPlanaResponse } from "@/lib/ai/chat";
import { canAccessPlanaAi } from "@/lib/ai/plana-access";
import { PlanaNotConfiguredError } from "@/lib/ai/providers";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { UIMessage } from "ai";
import { fetchQuery } from "convex/nextjs";
import type { NextRequest } from "next/server";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export const runtime = "nodejs";

function toUiMessages(
  messages: {
    role: "user" | "assistant";
    parts: { type: "text"; text: string }[];
  }[],
): UIMessage[] {
  return messages.map((message, index) => ({
    id: `${message.role}-${index}`,
    role: message.role,
    parts: message.parts,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!canAccessPlanaAi(user)) {
      return new Response("Plana AI is disabled", { status: 503 });
    }

    const authResult = await auth();
    const token = await authResult.getToken({ template: "convex" });

    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { chatId, messages, timeZone } = (await req.json()) as {
      chatId?: Id<"planaChat">;
      messages?: UIMessage[];
      timeZone?: string;
    };

    let resolvedMessages: UIMessage[];

    if (Array.isArray(messages) && messages.length > 0) {
      if (chatId) {
        await fetchQuery(
          api.planaChat.getLlmContext,
          { chatId, maxTurns: 0 },
          { token },
        );
      }

      resolvedMessages = messages;
    } else if (chatId) {
      const context = await fetchQuery(
        api.planaChat.getLlmContext,
        { chatId },
        { token },
      );
      resolvedMessages = toUiMessages(context);
    } else {
      return new Response("Invalid messages", { status: 400 });
    }

    const senseiName =
      user?.firstName?.trim() || user?.username?.trim() || undefined;
    const result = await streamPlanaResponse(resolvedMessages, {
      senseiName,
      timeZone,
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof PlanaNotConfiguredError) {
      return new Response("Plana AI is not configured", { status: 503 });
    }

    console.error("Error streaming Plana AI response:", error);
    return new Response("Failed to stream response from Plana AI", {
      status: 500,
    });
  }
}
