import { TimelineEditor } from "@/app/[locale]/timeline-visualizer/_components/timeline-editor";
import { DirtyStateTrackerProvider } from "@/components/providers/dirty-state-tracker-provider";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { HelpCircleIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata() {
  return getCardMetadata("timeline-visualizer", await getLocale());
}

export default async function TimelineVisualizerPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("tools.timeline.title")}</h1>
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
