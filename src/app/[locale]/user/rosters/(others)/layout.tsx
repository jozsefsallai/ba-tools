import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { Link } from "@/i18n/navigation";

export default async function MyRostersOthersLayout({
  children,
}: PropsWithChildren) {
  await auth.protect();
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" asChild>
          <Link href="/user/rosters">
            <ChevronLeft />
            {t("common.backTo", {
              destination: t("tools.roster.myRosters.title"),
            })}
          </Link>
        </Button>
      </div>

      {children}
    </div>
  );
}
