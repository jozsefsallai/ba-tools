import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";

export default async function MyRostersHomeLayout({
  children,
}: PropsWithChildren) {
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
