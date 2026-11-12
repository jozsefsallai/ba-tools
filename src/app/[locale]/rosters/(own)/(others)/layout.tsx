import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function MyRostersOthersLayout({
  children,
}: PropsWithChildren) {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" asChild>
          <Link href="/rosters">
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
