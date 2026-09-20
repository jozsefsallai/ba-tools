"use client";

import { createAdminBanner } from "@/app/[locale]/admin/banners/_lib/api";
import type { AdminBanner } from "@/app/[locale]/admin/banners/types";
import { StudentPicker } from "@/components/common/student-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { bannerGroupKey } from "@/lib/admin/game-banner-dates";
import { format } from "date-fns";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type PropsWithChildren, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Student } from "~prisma";

export type BannerGroupOption = {
  key: string;
  startDate: string;
  endDate: string;
};

export type NewBannerDialogProps = PropsWithChildren<{
  groups: BannerGroupOption[];
  onCreated: (banner: AdminBanner) => void;
}>;

export function NewBannerDialog({
  groups,
  onCreated,
  children,
}: NewBannerDialogProps) {
  const t = useTranslations();
  const closeRef = useRef<HTMLButtonElement>(null);

  const [groupKey, setGroupKey] = useState(groups[0]?.key ?? "");
  const [name, setName] = useState("");
  const [freePulls, setFreePulls] = useState(0);
  const [isSelectablePickup, setIsSelectablePickup] = useState(false);
  const [pickupStudents, setPickupStudents] = useState<Student[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === groupKey) ?? groups[0],
    [groupKey, groups],
  );

  async function handleCreate() {
    if (!selectedGroup) {
      toast.error(t("tools.admin.banners.toasts.noGroup"));
      return;
    }

    if (pickupStudents.length === 0) {
      toast.error(t("tools.admin.banners.toasts.needStudents"));
      return;
    }

    setSaving(true);
    try {
      const banner = await createAdminBanner({
        name: name.trim() || null,
        startDate: selectedGroup.startDate,
        endDate: selectedGroup.endDate,
        freePulls,
        isSelectablePickup,
        pickupStudentIds: pickupStudents.map((student) => student.id),
      });
      onCreated(banner);
      setName("");
      setFreePulls(0);
      setIsSelectablePickup(false);
      setPickupStudents([]);
      closeRef.current?.click();
      toast.success(t("tools.admin.banners.toasts.createSuccess"));
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : t("tools.admin.banners.toasts.createFail"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("tools.admin.banners.newBanner.title")}</DialogTitle>
          <DialogDescription>
            {t("tools.admin.banners.newBanner.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("tools.admin.banners.fields.dateRange")}</Label>
            <Select
              value={selectedGroup?.key ?? ""}
              onValueChange={setGroupKey}
              disabled={groups.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t(
                    "tools.admin.banners.fields.dateRangePlaceholder",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.key} value={group.key}>
                    {format(new Date(group.startDate), "MMM d, yyyy")} -{" "}
                    {format(new Date(group.endDate), "MMM d, yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.admin.banners.fields.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("tools.admin.banners.fields.namePlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.admin.banners.fields.freePulls")}</Label>
            <Input
              type="number"
              min={0}
              value={freePulls}
              onChange={(e) =>
                setFreePulls(Number.parseInt(e.target.value, 10) || 0)
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="new-selectable-pickup">
              {t("tools.admin.banners.fields.selectablePickup")}
            </Label>
            <Switch
              id="new-selectable-pickup"
              checked={isSelectablePickup}
              onCheckedChange={setIsSelectablePickup}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("tools.admin.banners.fields.pickupStudents")}</Label>

            <div className="flex flex-wrap gap-2">
              {pickupStudents.map((student) => (
                <Button
                  key={student.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setPickupStudents((prev) =>
                      prev.filter((s) => s.id !== student.id),
                    )
                  }
                >
                  {student.name}
                  <XIcon className="size-3" />
                </Button>
              ))}
            </div>

            <StudentPicker
              onStudentSelected={(student) => {
                setPickupStudents((prev) => {
                  if (prev.some((s) => s.id === student.id)) {
                    return prev;
                  }
                  return [...prev, student];
                });
              }}
            >
              <Button type="button" variant="outline" size="sm">
                {t("tools.admin.banners.fields.addStudent")}
              </Button>
            </StudentPicker>
          </div>
        </div>

        <DialogFooter>
          <DialogClose ref={closeRef} />
          <Button type="button" onClick={handleCreate} disabled={saving}>
            {t("tools.admin.banners.newBanner.create")}
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

export function groupOptionsFromEntries(
  entries: Array<{ startDate: string; endDate: string }>,
): BannerGroupOption[] {
  const seen = new Set<string>();
  const options: BannerGroupOption[] = [];

  for (const entry of entries) {
    const key = bannerGroupKey(entry.startDate, entry.endDate);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    options.push({
      key,
      startDate: entry.startDate,
      endDate: entry.endDate,
    });
  }

  return options;
}
