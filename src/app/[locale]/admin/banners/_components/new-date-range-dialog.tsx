"use client";

import { DatePickerButton } from "@/app/[locale]/admin/banners/_components/date-picker-button";
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
import { Label } from "@/components/ui/label";
import {
  toBannerEndFromCalendar,
  toBannerStartFromCalendar,
} from "@/lib/admin/game-banner-dates";
import { addDays } from "date-fns";
import { useTranslations } from "next-intl";
import { type PropsWithChildren, useRef, useState } from "react";
import { toast } from "sonner";

export type NewDateRangeDialogProps = PropsWithChildren<{
  onCreate: (startDate: string, endDate: string) => void;
}>;

export function NewDateRangeDialog({
  onCreate,
  children,
}: NewDateRangeDialogProps) {
  const t = useTranslations();
  const closeRef = useRef<HTMLButtonElement>(null);

  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => addDays(new Date(), 13));

  function handleCreate() {
    const start = toBannerStartFromCalendar(startDate);
    const end = toBannerEndFromCalendar(endDate);

    if (end <= start) {
      toast.error(t("tools.admin.banners.toasts.invalidDates"));
      return;
    }

    onCreate(start.toISOString(), end.toISOString());
    closeRef.current?.click();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("tools.admin.banners.newDateRange.title")}
          </DialogTitle>
          <DialogDescription>
            {t("tools.admin.banners.newDateRange.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("tools.admin.banners.fields.startDate")}</Label>
            <DatePickerButton value={startDate} onChange={setStartDate} />
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.admin.banners.fields.endDate")}</Label>
            <DatePickerButton value={endDate} onChange={setEndDate} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose ref={closeRef} />
          <Button type="button" onClick={handleCreate}>
            {t("tools.admin.banners.newDateRange.create")}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t("common.dialogs.confirm.cancel")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
