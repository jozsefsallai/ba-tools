"use client";

import { AdminBannerItem } from "@/app/[locale]/admin/banners/_components/admin-banner-item";
import { DatePickerButton } from "@/app/[locale]/admin/banners/_components/date-picker-button";
import { updateAdminBannerGroup } from "@/app/[locale]/admin/banners/_lib/api";
import type { AdminBanner } from "@/app/[locale]/admin/banners/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  calendarDateFromBannerTimestamp,
  toBannerEndFromCalendar,
  toBannerStartFromCalendar,
} from "@/lib/admin/game-banner-dates";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export type AdminBannerGroupProps = {
  groupKey: string;
  startDate: string;
  endDate: string;
  banners: AdminBanner[];
  isEmptyLocal?: boolean;
  onBannerUpdated: (banner: AdminBanner) => void;
  onBannerDeleted: (id: string) => void;
  onGroupDatesUpdated: (
    oldKey: string,
    newStartDate: string,
    newEndDate: string,
  ) => void;
  onRemoveEmptyGroup: (key: string) => void;
};

export function AdminBannerGroup({
  groupKey,
  startDate,
  endDate,
  banners,
  isEmptyLocal,
  onBannerUpdated,
  onBannerDeleted,
  onGroupDatesUpdated,
  onRemoveEmptyGroup,
}: AdminBannerGroupProps) {
  const t = useTranslations();
  const { setNodeRef, isOver } = useDroppable({
    id: groupKey,
    data: {
      type: "group",
      startDate,
      endDate,
    },
  });

  const [savingDates, setSavingDates] = useState(false);

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();

  const distanceDaysVal = Math.ceil(
    (startMs - Date.now()) / (1000 * 60 * 60 * 24),
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

  const durationDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
  const now = Date.now();
  const isCurrent = startMs <= now && now <= endMs;

  const forDaysRich = t.rich("static.banners.group.forDays", {
    strong: (chunks) => <strong>{chunks}</strong>,
    count: durationDays,
  });

  async function applyDateChange(nextStart: Date, nextEnd: Date) {
    const newStart = toBannerStartFromCalendar(nextStart);
    const newEnd = toBannerEndFromCalendar(nextEnd);

    if (newEnd <= newStart) {
      toast.error(t("tools.admin.banners.toasts.invalidDates"));
      return;
    }

    if (
      newStart.toISOString() === startDate &&
      newEnd.toISOString() === endDate
    ) {
      return;
    }

    if (isEmptyLocal || banners.length === 0) {
      onGroupDatesUpdated(
        groupKey,
        newStart.toISOString(),
        newEnd.toISOString(),
      );
      return;
    }

    setSavingDates(true);
    try {
      const result = await updateAdminBannerGroup({
        oldStartDate: startDate,
        oldEndDate: endDate,
        newStartDate: newStart.toISOString(),
        newEndDate: newEnd.toISOString(),
      });
      onGroupDatesUpdated(groupKey, result.startDate, result.endDate);
      toast.success(t("tools.admin.banners.toasts.groupSaveSuccess"));
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : t("tools.admin.banners.toasts.groupSaveFail"),
      );
    } finally {
      setSavingDates(false);
    }
  }

  return (
    <div ref={setNodeRef} className="h-full">
      <Card
        className={cn("bg-card/60 transition-shadow h-full", {
          "ring-4 ring-yellow-400/40": isCurrent,
          "ring-4 ring-primary/40": isOver,
        })}
      >
        <CardHeader>
          <CardTitle className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <DatePickerButton
                  value={calendarDateFromBannerTimestamp(startDate)}
                  disabled={savingDates}
                  onChange={(date) =>
                    applyDateChange(
                      date,
                      calendarDateFromBannerTimestamp(endDate),
                    )
                  }
                />
                <span className="text-muted-foreground">-</span>
                <DatePickerButton
                  value={calendarDateFromBannerTimestamp(endDate)}
                  disabled={savingDates}
                  onChange={(date) =>
                    applyDateChange(
                      calendarDateFromBannerTimestamp(startDate),
                      date,
                    )
                  }
                />
              </div>

              <div className="text-sm text-muted-foreground">
                {distanceDays}
              </div>
            </div>

            {(isEmptyLocal || banners.length === 0) && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveEmptyGroup(groupKey)}
                >
                  <Trash2Icon className="size-4" />
                  {t("tools.admin.banners.removeEmptyGroup")}
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1">
          <div className="flex flex-col gap-2 min-h-16">
            {banners.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                {t("tools.admin.banners.emptyGroup")}
              </div>
            )}

            {[...banners]
              .sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              )
              .map((banner) => (
                <AdminBannerItem
                  key={banner.id}
                  banner={banner}
                  onUpdated={onBannerUpdated}
                  onDeleted={onBannerDeleted}
                />
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
    </div>
  );
}
