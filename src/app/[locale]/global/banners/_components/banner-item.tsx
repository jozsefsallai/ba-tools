"use client";

import { BannerPickupList } from "@/app/[locale]/global/banners/_components/banner-pickup-list";
import type {
  BannerStudent,
  PublicGameBanner,
} from "@/app/[locale]/global/banners/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const PICKUP_STUDENTS_COLLAPSED_COUNT = 3;

export type BannerItemProps = {
  banner: Omit<PublicGameBanner, "pickupStudents"> & {
    pickupStudents: BannerStudent[];
  };
};

export function BannerItem({ banner }: BannerItemProps) {
  const t = useTranslations();

  const hasFestStudent = banner.pickupStudents.some(
    (student) => student.isFestGlobal,
  );

  return (
    <div>
      {banner.name && (
        <div className="text-xs font-bold text-muted-foreground uppercase text-center px-2 py-1 pb-4 border bg-background/80 rounded-md">
          {banner.name}
        </div>
      )}

      <div
        className={cn(
          "border rounded-md p-4 shadow-lg bg-card relative overflow-hidden",
          {
            "border-primary/75": hasFestStudent && !banner.isSelectablePickup,
            "-mt-3": banner.name,
          },
        )}
      >
        {hasFestStudent && !banner.isSelectablePickup && (
          <div className="bg-gradient-to-r from-transparent via-primary/15 dark:via-primary/35 to-transparent w-4/5 absolute left-2/5 -skew-x-[45deg] top-0 bottom-0" />
        )}

        <div className="relative flex flex-col gap-4">
          {banner.isSelectablePickup && (
            <>
              <div className="text-sm text-muted-foreground text-center">
                {t("static.banners.item.selectablePickup")}
              </div>
              <div className="border-border shrink-0 bg-border h-px w-full mb-2" />
            </>
          )}

          <BannerPickupList
            students={banner.pickupStudents}
            isSelectablePickup={banner.isSelectablePickup}
            freePulls={banner.freePulls}
            collapsedCount={PICKUP_STUDENTS_COLLAPSED_COUNT}
          />
        </div>
      </div>
    </div>
  );
}
