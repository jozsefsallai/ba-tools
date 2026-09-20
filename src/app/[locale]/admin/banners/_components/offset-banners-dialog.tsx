"use client";

import { DatePickerButton } from "@/app/[locale]/admin/banners/_components/date-picker-button";
import { offsetAdminBanners } from "@/app/[locale]/admin/banners/_lib/api";
import type { AdminBanner } from "@/app/[locale]/admin/banners/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toBannerStartFromCalendar } from "@/lib/admin/game-banner-dates";
import { useTranslations } from "next-intl";
import { type PropsWithChildren, useRef, useState } from "react";
import { toast } from "sonner";

export type OffsetBannersDialogProps = PropsWithChildren<{
  onOffset: (
    banners: AdminBanner[],
    offsetDays: number,
    fromStart: string,
  ) => void;
}>;

export function OffsetBannersDialog({
  onOffset,
  children,
}: OffsetBannersDialogProps) {
  const t = useTranslations();
  const closeRef = useRef<HTMLButtonElement>(null);

  const [currentStart, setCurrentStart] = useState(() => new Date());
  const [offsetDays, setOffsetDays] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleOffset() {
    if (offsetDays === 0) {
      toast.error(t("tools.admin.banners.toasts.offsetZero"));
      return;
    }

    setSaving(true);
    try {
      const startDate = toBannerStartFromCalendar(currentStart).toISOString();
      const result = await offsetAdminBanners({
        currentStartDate: startDate,
        offsetDays,
      });

      onOffset(result.banners, offsetDays, startDate);
      toast.success(
        t("tools.admin.banners.toasts.offsetSuccess", {
          count: result.updatedCount,
        }),
      );
      closeRef.current?.click();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : t("tools.admin.banners.toasts.offsetFail"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tools.admin.banners.offset.title")}</DialogTitle>
          <DialogDescription>
            {t("tools.admin.banners.offset.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("tools.admin.banners.offset.fromStartDate")}</Label>
            <DatePickerButton value={currentStart} onChange={setCurrentStart} />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="offset-days">
              {t("tools.admin.banners.offset.offsetDays")}
            </Label>
            <Input
              id="offset-days"
              type="number"
              value={offsetDays}
              onChange={(e) =>
                setOffsetDays(Number.parseInt(e.target.value, 10) || 0)
              }
            />
            <p className="text-xs text-muted-foreground">
              {t("tools.admin.banners.offset.offsetDaysHint")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose ref={closeRef} />
          <Button type="button" onClick={handleOffset} disabled={saving}>
            {t("tools.admin.banners.offset.apply")}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={saving}>
              {t("common.dialogs.confirm.cancel")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
