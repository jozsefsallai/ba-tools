import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { requireContentManager } from "@/lib/auth/require-role";
import type { syncUpcomingContentTask } from "@/trigger/sync-upcoming-content";

export const runtime = "nodejs";

// Starts a sync of the game files right away. The task cancels the checks it
// had scheduled while waiting for JP maintenance to end.
export async function POST() {
  const { error } = await requireContentManager();
  if (error) {
    return error;
  }

  if (!process.env.TRIGGER_SECRET_KEY) {
    return NextResponse.json(
      {
        error: "TRIGGER_SECRET_KEY is not set",
      },
      {
        status: 503,
      },
    );
  }

  const handle = await tasks.trigger<typeof syncUpcomingContentTask>(
    "sync-upcoming-content",
    {
      source: "manual",
    },
  );

  return NextResponse.json({
    runId: handle.id,
  });
}
