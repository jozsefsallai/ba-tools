import { BannerItem } from "@/app/global/banners/_components/banner-item";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GameBanner, Student } from "@prisma/client";
import { format } from "date-fns";

export type BannerGroupProps = {
  dates: [number, number];
  banners: Array<GameBanner & { pickupStudents: Student[] }>;
};

function distanceFromNow(date: number) {
  const distanceDays = Math.ceil((date - Date.now()) / (1000 * 60 * 60 * 24));

  if (distanceDays > 1) {
    return `in ${distanceDays} days`;
  }

  if (distanceDays === 1) {
    return "tomorrow";
  }

  if (distanceDays === 0) {
    return "today";
  }

  if (distanceDays === -1) {
    return "yesterday";
  }

  return `${Math.abs(distanceDays)} days ago`;
}

export function BannerGroup({ dates, banners }: BannerGroupProps) {
  const formattedStartDate = format(new Date(dates[0]), "MMM d, yyyy");
  const formattedEndDate = format(new Date(dates[1]), "MMM d, yyyy");

  const distanceDays = distanceFromNow(dates[0]);

  const durationDays = Math.ceil((dates[1] - dates[0]) / (1000 * 60 * 60 * 24));

  return (
    <Card>
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
          {banners.map((banner) => (
            <BannerItem key={banner.id} banner={banner} />
          ))}
        </div>
      </CardContent>

      <CardFooter className="text-sm text-muted-foreground self-end">
        {banners.length === 1 ? "This banner lasts" : "These banners last"}{" "}
        for&nbsp;<strong>{durationDays} days</strong>.
      </CardFooter>
    </Card>
  );
}
