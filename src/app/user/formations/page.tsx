import { FormationsBrowser } from "@/app/user/formations/_components/formations-browser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.formationDisplay.myFormations.title")} - ${t("common.appName")}`,
    description: t("tools.formationDisplay.myFormations.description"),
    twitter: {
      card: "summary",
    },
  };
}

export default async function MyFormationsPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">
            {t("tools.formationDisplay.myFormations.title")}
          </h1>
          <Button asChild>
            <Link href="/formation-display">
              {t("tools.formationDisplay.myFormations.createNew")}
            </Link>
          </Button>
        </div>
        <p>{t("tools.formationDisplay.myFormations.description")}</p>
      </div>

      <Separator />

      <FormationsBrowser />
    </div>
  );
}
