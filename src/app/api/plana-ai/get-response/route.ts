import { getPlanaResponse } from "@/lib/ai/chat";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { input } = await req.json();

  if (!input || typeof input !== "string") {
    return new Response("Invalid input", { status: 400 });
  }

  try {
    const response = await getPlanaResponse(input);
    return new Response(
      JSON.stringify({
        input,
        response,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error getting Plana AI response:", error);
    return new Response("Failed to get response from Plana AI", {
      status: 500,
    });
  }
}
