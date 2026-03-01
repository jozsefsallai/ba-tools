import { BannerItem } from "@/app/global/banners/_components/banner-item";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GameBanner, Student } from "~prisma";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";

export type BannerGroupProps = {
  dates: [number, number];
  banners: Array<GameBanner & { pickupStudents: Student[] }>;
};

export async function BannerGroup({ dates, banners }: BannerGroupProps) {
  const t = await getTranslations();

  const formattedStartDate = format(new Date(dates[0]), "MMM d, yyyy");
  const formattedEndDate = format(new Date(dates[1]), "MMM d, yyyy");

  const distanceDaysVal = Math.ceil(
    (dates[0] - Date.now()) / (1000 * 60 * 60 * 24),
  );
  let distanceDays: string;
  if (distanceDaysVal > 1) {
    distanceDays = t("static.banners.group.inDays", { count: distanceDaysVal });
  } else if (distanceDaysVal === 1) {
    distanceDays = t("static.banners.group.tomorrow");
  } else if (distanceDaysVal === 0) {
    distanceDays = t("static.banners.group.today");
  } else if (distanceDaysVal === -1) {
    distanceDays = t("static.banners.group.yesterday");
  } else {
    distanceDays = t("static.banners.group.daysAgo", {
      count: Math.abs(distanceDaysVal),
    });
  }

  const durationDays = Math.ceil((dates[1] - dates[0]) / (1000 * 60 * 60 * 24));

  const now = Date.now();
  const isCurrent = dates[0] <= now && now <= dates[1];

  const forDaysRich = t.rich("static.banners.group.forDays", {
    strong: (chunks) => <strong>{chunks}</strong>,
    count: durationDays,
  });

  return (
    <Card
      className={cn("bg-card/60", {
        "ring-4 ring-yellow-400/40": isCurrent,
      })}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <div className="text-sm md:text-lg">
            {formattedStartDate} - {formattedEndDate}
          </div>

          <div className="text-sm md:text-base text-muted-foreground">
            {distanceDays}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex flex-col gap-4">
          {banners
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((banner) => (
              <BannerItem key={banner.id} banner={banner} />
            ))}
        </div>
      </CardContent>

      <CardFooter className="flex-col md:flex-row text-sm text-muted-foreground justify-between">
        {isCurrent && (
          <div className="text-yellow-400 font-bold">
            {banners.length === 1
              ? t("static.banners.group.currentBanner")
              : t("static.banners.group.currentBanners")}
          </div>
        )}
        {!isCurrent && <div />}

        <div>
          {banners.length === 1
            ? t("static.banners.group.bannerLasts")
            : t("static.banners.group.bannersLast")}{" "}
          {forDaysRich}
        </div>
      </CardFooter>
    </Card>
  );
}
