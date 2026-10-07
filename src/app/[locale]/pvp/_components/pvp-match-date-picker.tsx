"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { usePvpMatchDate } from "@/hooks/use-pvp-match-date";
import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

export function PvpMatchDatePicker({
  value,
  editing = false,
  disabled = false,
}: {
  value: ReturnType<typeof usePvpMatchDate>;
  editing?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("tools.pvp.match");
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{t("date")}</Label>

      <div className="flex items-center gap-2">
        <Popover open={open && !disabled} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              disabled={disabled}
              className="min-w-0 flex-1 justify-between"
            >
              {value.date.toLocaleDateString()} <ChevronDownIcon />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={value.date}
              defaultMonth={value.date}
              captionLayout="dropdown"
              disabled={disabled}
              onSelect={(date) => {
                value.handleDateSelection(date);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        {!editing && (
          <ToggleGroup
            type="single"
            value={value.dateMode}
            disabled={disabled}
            size="sm"
            variant="default"
            className="gap-1 rounded-lg border bg-muted/40 p-1 shadow-sm"
            aria-label={t("date")}
            onValueChange={(mode) => {
              if (mode === "today" || mode === "last")
                value.setDateModeAndDefault(mode);
            }}
          >
            <ToggleGroupItem
              value="last"
              disabled={disabled || !value.lastDate}
              className="rounded-md px-3 text-xs font-semibold hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:text-primary-foreground data-[state=on]:shadow-sm"
            >
              {t("last")}
            </ToggleGroupItem>

            <ToggleGroupItem
              value="today"
              className="rounded-md px-3 text-xs font-semibold hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:text-primary-foreground data-[state=on]:shadow-sm"
            >
              {t("today")}
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
    </div>
  );
}
