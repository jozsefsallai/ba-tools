import { Suspense } from "react";
import { TimelineEditor } from "@/app/timeline-visualizer/_components/timeline-editor";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { HelpCircleIcon } from "lucide-react";

import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import { auth } from "@clerk/nextjs/server";
import { DirtyStateTrackerProvider } from "@/components/providers/dirty-state-tracker-provider";

type PageSearchParams = {
  id?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Timeline Visualizer - Joe's Blue Archive Tools",
    description: "Create a visual rotation timeline.",
    twitter: {
      card: "summary",
    },
  };

  const params = await searchParams;

  if (!params.id) {
    return fallback;
  }

  try {
    const token = await (await auth()).getToken({ template: "convex" });

    if (!token) {
      return fallback;
    }

    const timeline = await fetchQuery(
      api.timeline.getOwnById,
      {
        id: params.id as Id<"timeline">,
      },
      {
        token,
      },
    );

    return {
      title: `${timeline.name ?? "Untitled Timeline"} - Joe's Blue Archive Tools`,
      description: "Create a visual rotation timeline.",
      twitter: {
        card: "summary",
      },
    };
  } catch {
    return fallback;
  }
}

export default async function TimelineVisualizerPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Timeline Visualizer</h1>
          <HelpSheet document="timeline-visualizer">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>
      </div>

      <Suspense>
        <DirtyStateTrackerProvider>
          <TimelineEditor />
        </DirtyStateTrackerProvider>
      </Suspense>
    </div>
  );
}
