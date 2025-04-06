import { FormationEditor } from "@/app/formation-display/_components/formation-editor";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { HelpCircleIcon } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Formation Display - Joe's Blue Archive Tools",
  description:
    "Generate an image of a student formation. Useful for things like YouTube thumbnails.",
  twitter: {
    card: "summary",
  },
};

export default async function FormationDisplayPage() {
  const allStudents = await db.student.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Formation Display</h1>
          <HelpSheet document="formation-display">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>
        <p>
          This tool allows you to generate an image of a student formation. This
          can be useful for cases such as designing clean YouTube thumbnails.
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

      <FormationEditor allStudents={allStudents} />
    </div>
  );
}
