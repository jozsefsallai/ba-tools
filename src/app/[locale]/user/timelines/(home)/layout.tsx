import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale, getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";

export async function generateMetadata() {
  return getCardMetadata("user-timelines", await getLocale());
}

export default async function MyTimelinesHomeLayout({
  children,
}: PropsWithChildren) {
  await auth.protect();
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">{t("tools.myTimelines.title")}</h1>

          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Link href="/user/timelines/new-group">
                {t("tools.myTimelines.newGroup")}
              </Link>
            </Button>

            <Button asChild>
              <Link href="/timeline-visualizer">
                {t("tools.myTimelines.newTimeline")}
              </Link>
            </Button>
          </div>
        </div>
        <p>{t("tools.myTimelines.description")}</p>
      </div>

      <Separator />

      {children}
    </div>
  );
}
