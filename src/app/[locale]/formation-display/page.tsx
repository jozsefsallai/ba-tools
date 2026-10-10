import { FormationEditor } from "@/app/[locale]/formation-display/_components/formation-editor";
import { DirtyStateTrackerProvider } from "@/components/providers/dirty-state-tracker-provider";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { HelpCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}): Promise<Metadata> {
  const locale = await getLocale();

  const fallback = await getCardMetadata("formation-display", locale);

  const { id } = await searchParams;

  if (typeof id !== "string" || !id) {
    return fallback;
  }

  try {
    const token = await (await auth()).getToken({ template: "convex" });

    if (!token) {
      return fallback;
    }
    const formation = await fetchQuery(
      api.formation.getById,
      { id: id as Id<"formation"> },
      { token },
    );

    const t = await getTranslations({ locale });

    return {
      ...fallback,
      title: t("common.sharing.title", {
        title: formation.name?.trim() || t("common.untitledFormation"),
        appName: t("common.appName"),
      }),
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
