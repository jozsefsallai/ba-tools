import { FormationEditor } from "@/app/formation-display/_components/formation-editor";
import { DirtyStateTrackerProvider } from "@/components/providers/dirty-state-tracker-provider";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { HelpCircleIcon } from "lucide-react";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations();

  const fallback: Metadata = {
    title: `${t("tools.formationDisplay.title")} - ${t("common.appName")}`,
    description: t("tools.formationDisplay.description"),
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
      title: `${formation.name ?? t("common.untitledFormation")} - ${t("common.appName")}`,
      description: t("tools.formationDisplay.description"),
      twitter: {
        card: "summary",
      },
    };
  } catch {
    return fallback;
  }
}

export default async function FormationDisplayPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">
            {t("tools.formationDisplay.title")}
          </h1>
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
