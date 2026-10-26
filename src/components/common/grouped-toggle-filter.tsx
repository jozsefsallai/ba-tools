"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export type GroupedToggleOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

export type GroupedToggleGroup<K extends string, T extends string = string> = {
  key: K;
  label: string;
  icon?: ReactNode;
  /** Replaces the shared options for this row. */
  options?: GroupedToggleOption<T>[];
};

type GroupedToggleFilterProps<K extends string, T extends string> = {
  label: string;
  groups: GroupedToggleGroup<K, T>[];
  options?: GroupedToggleOption<T>[];
  selected: Record<K, T[]>;
  onChange: (group: K, selected: T[]) => void;
  /** Shows only the option icons in the toggles, with the label as a tooltip. */
  iconOnly?: boolean;
  /** Extra classes for each toggle. */
  toggleClassName?: string;
  /** Extra classes for selected toggles. */
  pressedToggleClassName?: string;
};

/**
 * A filter with one row of toggles per group, like terrain grades per terrain
 * or equipment per slot. Values within a row are alternatives; rows combine.
 */
export function GroupedToggleFilter<K extends string, T extends string>({
  label,
  groups,
  options,
  selected,
  onChange,
  iconOnly = false,
  toggleClassName,
  pressedToggleClassName,
}: GroupedToggleFilterProps<K, T>) {
  const t = useTranslations();

  const activeCount = groups.reduce(
    (count, group) => count + (selected[group.key].length > 0 ? 1 : 0),
    0,
  );

  function toggle(group: K, value: T) {
    const current = selected[group];
    onChange(
      group,
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between gap-1.5", {
            "border-primary/60 bg-primary/5 dark:bg-primary/10":
              activeCount > 0,
          })}
        >
          <span className="text-muted-foreground">{label}</span>

          {activeCount > 0 && (
            <span className="font-semibold">
              {t("common.filters.selected", { count: activeCount })}
            </span>
          )}

          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-auto max-w-[calc(100vw-2rem)] p-2"
      >
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                {group.icon}
                {group.label}
              </div>

              <div className="flex flex-wrap gap-1">
                {(group.options ?? options ?? []).map((option) => {
                  const pressed = selected[group.key].includes(option.value);

                  return (
                    <Button
                      key={option.value}
                      variant="outline"
                      size="sm"
                      aria-pressed={pressed}
                      title={option.label}
                      onClick={() => toggle(group.key, option.value)}
                      // `toggleClassName` comes last so a custom background
                      // survives the pressed state.
                      className={cn(
                        "gap-1 px-2",
                        pressed &&
                          "border-primary bg-primary/10 ring-primary ring-1 dark:bg-primary/20",
                        toggleClassName,
                        pressed && pressedToggleClassName,
                      )}
                    >
                      {option.icon}

                      {iconOnly ? (
                        <span className="sr-only">{option.label}</span>
                      ) : (
                        option.label
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {activeCount > 0 && (
          <div className="mt-2 border-t pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                for (const group of groups) {
                  onChange(group.key, []);
                }
              }}
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
