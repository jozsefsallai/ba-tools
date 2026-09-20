"use client";

import {
  deleteAdminBanner,
  updateAdminBanner,
} from "@/app/[locale]/admin/banners/_lib/api";
import type { AdminBanner } from "@/app/[locale]/admin/banners/types";
import { StudentPicker } from "@/components/common/student-picker";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVerticalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Student } from "~prisma";

export type AdminBannerItemProps = {
  banner: AdminBanner;
  onUpdated: (banner: AdminBanner) => void;
  onDeleted: (id: string) => void;
};

function studentIdsKey(students: Student[]) {
  return students
    .map((student) => student.id)
    .sort()
    .join(",");
}

export function AdminBannerItem({
  banner,
  onUpdated,
  onDeleted,
}: AdminBannerItemProps) {
  const t = useTranslations();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: banner.id,
      data: { type: "banner", banner },
    });

  const [name, setName] = useState(banner.name ?? "");
  const [freePulls, setFreePulls] = useState(banner.freePulls);
  const [isSelectablePickup, setIsSelectablePickup] = useState(
    banner.isSelectablePickup,
  );
  const [pickupStudents, setPickupStudents] = useState<Student[]>(
    banner.pickupStudents,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(banner.name ?? "");
    setFreePulls(banner.freePulls);
    setIsSelectablePickup(banner.isSelectablePickup);
    setPickupStudents(banner.pickupStudents);
  }, [banner]);

  const isDirty = useMemo(() => {
    return (
      (name.trim() || null) !== (banner.name ?? null) ||
      freePulls !== banner.freePulls ||
      isSelectablePickup !== banner.isSelectablePickup ||
      studentIdsKey(pickupStudents) !== studentIdsKey(banner.pickupStudents)
    );
  }, [banner, name, freePulls, isSelectablePickup, pickupStudents]);

  const hasFestStudent = pickupStudents.some((student) => student.isFestGlobal);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleSave() {
    if (pickupStudents.length === 0) {
      toast.error(t("tools.admin.banners.toasts.needStudents"));
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAdminBanner(banner.id, {
        name: name.trim() || null,
        freePulls,
        isSelectablePickup,
        pickupStudentIds: pickupStudents.map((student) => student.id),
      });
      onUpdated(updated);
      toast.success(t("tools.admin.banners.toasts.saveSuccess"));
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : t("tools.admin.banners.toasts.saveFail"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteAdminBanner(banner.id);
      onDeleted(banner.id);
      toast.success(t("tools.admin.banners.toasts.deleteSuccess"));
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : t("tools.admin.banners.toasts.deleteFail"),
      );
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-card/80 p-3 relative overflow-hidden",
        {
          "border-primary/60": hasFestStudent && !isSelectablePickup,
          "ring-1 ring-primary/40": isDirty,
        },
      )}
    >
      {hasFestStudent && !isSelectablePickup && (
        <div className="bg-gradient-to-r from-transparent via-primary/10 dark:via-primary/25 to-transparent w-4/5 absolute left-2/5 -skew-x-[45deg] top-0 bottom-0 pointer-events-none" />
      )}

      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1 rounded-sm"
            {...listeners}
            {...attributes}
          >
            <GripVerticalIcon className="size-4" />
            <span className="sr-only">
              {t("tools.admin.banners.dragHandle")}
            </span>
          </button>

          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("tools.admin.banners.fields.namePlaceholder")}
            className="h-7 text-xs flex-1 min-w-0"
          />

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {t("tools.admin.banners.fields.freePullsShort")}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={freePulls}
                    onChange={(e) =>
                      setFreePulls(Number.parseInt(e.target.value, 10) || 0)
                    }
                    className="h-7 w-14 px-1.5 text-xs tabular-nums"
                    aria-label={t("tools.admin.banners.fields.freePulls")}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {t("tools.admin.banners.fields.freePulls")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {t("tools.admin.banners.fields.selectablePickupShort")}
                  </span>
                  <Switch
                    checked={isSelectablePickup}
                    onCheckedChange={setIsSelectablePickup}
                    aria-label={t(
                      "tools.admin.banners.fields.selectablePickup",
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {t("tools.admin.banners.fields.selectablePickup")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-0.5 shrink-0 ml-auto">
            <Button
              type="button"
              size="icon"
              variant={isDirty ? "default" : "ghost"}
              className="size-7"
              onClick={handleSave}
              disabled={saving || !isDirty}
              title={t("tools.admin.banners.save")}
            >
              <SaveIcon className="size-3.5" />
              <span className="sr-only">{t("tools.admin.banners.save")}</span>
            </Button>

            <ConfirmDialog
              title={t("tools.admin.banners.delete.title")}
              description={t("tools.admin.banners.delete.description")}
              confirmText={t("tools.admin.banners.delete.confirm")}
              confirmVariant="destructive"
              onConfirm={handleDelete}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                title={t("tools.admin.banners.delete.confirm")}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </ConfirmDialog>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pl-6">
          {pickupStudents.map((student) => (
            <div
              key={student.id}
              className="group flex items-center gap-1.5 rounded-md border bg-background/60 pl-1 pr-0.5 py-0.5 max-w-full"
            >
              <img
                src={buildStudentIconUrl(student)}
                alt=""
                className="h-7 w-auto shrink-0 rounded-sm object-contain"
              />
              <span className="text-xs font-medium truncate max-w-28">
                {student.name}
              </span>
              {(student.isFestGlobal || student.isLimitedGlobal) && (
                <div className="flex gap-0.5 shrink-0">
                  {student.isFestGlobal && (
                    <Badge className="h-4 px-1 text-[10px] leading-none">
                      {t("static.banners.item.fest")}
                    </Badge>
                  )}
                  {student.isLimitedGlobal && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1 text-[10px] leading-none"
                    >
                      {t("static.banners.item.limited")}
                    </Badge>
                  )}
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 opacity-50 group-hover:opacity-100"
                onClick={() =>
                  setPickupStudents((prev) =>
                    prev.filter((s) => s.id !== student.id),
                  )
                }
                title={t("tools.admin.banners.fields.removeStudent")}
              >
                <XIcon className="size-3" />
              </Button>
            </div>
          ))}

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
            >
              <PlusIcon className="size-3.5" />
              {t("tools.admin.banners.fields.addStudent")}
            </Button>
          </StudentPicker>
        </div>
      </div>
    </div>
  );
}
