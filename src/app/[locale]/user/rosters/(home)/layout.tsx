import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { Link } from "@/i18n/navigation";

export default async function MyRostersHomeLayout({
  children,
}: PropsWithChildren) {
  await auth.protect();
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">
            {t("tools.roster.myRosters.title")}
          </h1>

          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/user/rosters/new">
                {t("tools.roster.myRosters.newRoster")}
              </Link>
            </Button>
          </div>
        </div>

        <p>{t("tools.roster.myRosters.description")}</p>
      </div>

      <Separator />

      {children}
    </div>
  );
}
