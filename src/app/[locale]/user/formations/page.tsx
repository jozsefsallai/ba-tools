import { FormationsBrowser } from "@/app/[locale]/user/formations/_components/formations-browser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("user-formations", await getLocale());
}

export default async function MyFormationsPage() {
  await auth.protect();
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
