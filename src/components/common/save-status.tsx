"use client";

import { cn } from "@/lib/utils";
import { CheckIcon, LoaderCircleIcon, PencilLineIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

export type SaveStatusProps = {
  isDirty: boolean;
  isSaving?: boolean;
};

export function SaveStatus({ isDirty, isSaving }: SaveStatusProps) {
  const t = useTranslations();
  const locale = useLocale();

  const Icon = useMemo(() => {
    if (isSaving) {
      return <LoaderCircleIcon className="size-4 animate-spin" />;
    }

    if (isDirty) {
      return <PencilLineIcon className="size-4" />;
    }

    return <CheckIcon className="size-4" />;
  }, [isDirty, isSaving]);

  const label = useMemo(() => {
    if (isSaving) {
      return t("common.saveStatus.saving");
    }

    if (isDirty) {
      return t("common.saveStatus.dirty");
    }

    return t("common.saveStatus.ok");
  }, [isDirty, isSaving, locale]);

  return (
    <div
      className={cn("flex items-center gap-1 text-xs font-medium", {
        "text-green-400": !isDirty && !isSaving,
        "text-yellow-400": isDirty && !isSaving,
        "text-blue-400": isSaving,
      })}
    >
      {Icon}
      <span>{label}</span>
    </div>
  );
}
