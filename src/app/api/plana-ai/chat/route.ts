import { streamPlanaResponse } from "@/lib/ai/chat";
import { canAccessPlanaAi } from "@/lib/ai/plana-access";
import { PlanaNotConfiguredError } from "@/lib/ai/providers";
import { currentUser } from "@clerk/nextjs/server";
import type { UIMessage } from "ai";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!canAccessPlanaAi(user)) {
      return new Response("Plana AI is disabled", { status: 503 });
    }

    const { messages, timeZone } = (await req.json()) as {
      messages?: UIMessage[];
      timeZone?: string;
    };

    if (!Array.isArray(messages)) {
      return new Response("Invalid messages", { status: 400 });
    }

    const senseiName =
      user?.firstName?.trim() || user?.username?.trim() || undefined;
    const result = await streamPlanaResponse(messages, {
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
