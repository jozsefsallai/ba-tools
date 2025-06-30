import { TimelineEditor } from "@/app/timeline-visualizer/_components/timeline-editor";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { HelpCircleIcon } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Timeline Visualizer - Joe's Blue Archive Tools",
  description: "Create a visual rotation timeline.",
  twitter: {
    card: "summary",
  },
};

export default async function TimelineVisualizerPage() {
  const allStudents = await db.student.findMany({
    orderBy: {
      name: "asc",
    },
  });

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
        <p>
          This tool allows you to create a visual rotation timeline (e.g. for a
          raid). You can select students, adjust the spacing between them, set
          the cost/timestamp at which the student's skill cost should be used,
          and more.
        </p>
        <p className="md:hidden text-muted-foreground">
          <strong>Note:</strong> This tool might not work well on mobile
          devices.
        </p>
        <p className="text-muted-foreground">
          <strong>Note:</strong> Dark mode extensions and zoom levels may cause
          rendering issues in the resulting image. If the generated image looks
          weird, try disabling any dark mode extensions you may have and using
          100% zoom.
        </p>
      </div>

      <TimelineEditor allStudents={allStudents} />
    </div>
  );
}
