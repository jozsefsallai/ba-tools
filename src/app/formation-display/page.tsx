import { FormationEditor } from "@/app/formation-display/_components/formation-editor";
import { DirtyStateTrackerProvider } from "@/components/providers/dirty-state-tracker-provider";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { HelpCircleIcon } from "lucide-react";

import type { Metadata } from "next";
import { Suspense } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type PageSearchParams = {
  id?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Formation Display - Joe's Blue Archive Tools",
    description:
      "Generate an image of a student formation. Useful for things like YouTube thumbnails.",
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

    const formation = await fetchQuery(
      api.formation.getById,
      {
        id: params.id as Id<"formation">,
      },
      {
        token,
      },
    );

    return {
      title: `${formation.name ?? "Untitled Formation"} - Joe's Blue Archive Tools`,
      description:
        "Generate an image of a student formation. Useful for things like YouTube thumbnails.",
      twitter: {
        card: "summary",
      },
    };
  } catch {
    return fallback;
  }
}

export default async function FormationDisplayPage() {
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
      </div>

      <Suspense>
        <DirtyStateTrackerProvider loggedInOnly>
          <FormationEditor />
        </DirtyStateTrackerProvider>
      </Suspense>
    </div>
  );
}
