import { BannerList } from "@/app/[locale]/global/banners/_components/banner-list";
import type { BannerGroups } from "@/app/[locale]/global/banners/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { getCachedGameBanners } from "@/lib/game-banners.server";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { CalendarRangeIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("global-banners", await getLocale());
}

async function getBannerGroups(): Promise<BannerGroups> {
  const banners = await getCachedGameBanners();

  const groups: BannerGroups = new Map();

  for (const banner of banners) {
    const key = [banner.startDate.getTime(), banner.endDate.getTime()].join(
      ",",
    );

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)?.push(banner);
  }

  return groups;
}

export default async function BannersPage() {
  const bannerGroups = await getBannerGroups();
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("static.banners.title")}</h1>
        </div>

        <p>{t("static.banners.description")}</p>

        <p className="bg-card p-4 rounded-md border text-sm">
          {t.rich("static.banners.notice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </p>

        <Alert className="max-w-6xl">
          <CalendarRangeIcon />
          <AlertTitle className="font-bold">
            {t("static.banners.roadmapNotice.title")}
          </AlertTitle>
          <AlertDescription>
            <p>
              {t.rich("static.banners.roadmapNotice.description", {
                link: (children) => (
                  <Link
                    href="/global/roadmap"
                    className="underline font-medium text-foreground"
                  >
                    {children}
                  </Link>
                ),
              })}
            </p>
          </AlertDescription>
        </Alert>

        <Alert className="border-amber-400/70 bg-amber-50/40 text-foreground dark:border-amber-500/50 dark:bg-amber-950/30 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400 *:data-[slot=alert-description]:text-foreground max-w-6xl">
          <AlertTitle className="font-bold text-base">
            (10/8 Notice) &mdash; Upcoming 1-week acceleration
          </AlertTitle>

          <AlertDescription>
            <div>
              According to a{" "}
              <a
                href="https://forum.nexon.com/bluearchive-en/board_view?board=3028&thread=3560313"
                target="_blank"
                rel="noreferrer noopener"
                className="underline"
              >
                notice by Nexon
              </a>
              , the new recruitment system is scheduled to be implemented in the
              Global version of Blue Archive on <strong>November 10</strong>.
              This suggests that they will very likely cut a week between now
              and the Swimsuit Makoto + Swimsuit Satsuki banners.{" "}
              <strong>
                The banner list assumes the Hikari and Nozomi banner set will be
                cut in half to make room for the next banner set.
              </strong>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <Separator />

      <BannerList bannerGroups={bannerGroups} />
    </div>
  );
}
