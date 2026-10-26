"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export type MultiSelectFilterOption<T extends string | number> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type MultiSelectFilterProps<T extends string | number> = {
  label: string;
  options: MultiSelectFilterOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
};

export function MultiSelectFilter<T extends string | number>({
  label,
  options,
  selected,
  onChange,
}: MultiSelectFilterProps<T>) {
  const t = useTranslations();

  const selectedSet = new Set(selected);
  const isActive = selected.length > 0;

  function toggle(value: T) {
    if (selectedSet.has(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const summary =
    selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label
      : selected.length > 1
        ? t("common.filters.selected", { count: selected.length })
        : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between gap-1.5", {
            "border-primary/60 bg-primary/5 dark:bg-primary/10": isActive,
          })}
        >
          <span className="text-muted-foreground">{label}</span>

          {summary && (
            <span className="max-w-32 truncate font-semibold">{summary}</span>
          )}

          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-1">
        <div className="max-h-80 overflow-y-auto">
          {options.map((option) => (
            // biome-ignore lint/a11y/noLabelWithoutControl: the checkbox is the control
            <label
              key={option.value}
              className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <Checkbox
                checked={selectedSet.has(option.value)}
                onCheckedChange={() => toggle(option.value)}
              />
              {option.icon}
              <span className="truncate">{option.label}</span>
            </label>
          ))}
        </div>

        {isActive && (
          <div className="border-t mt-1 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onChange([])}
            >
              <XIcon />
              {t("common.filters.clear")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
