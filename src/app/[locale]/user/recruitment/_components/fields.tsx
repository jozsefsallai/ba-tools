"use client";

import { CalendarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { PoolMark } from "@/app/[locale]/user/recruitment/_components/shared";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  NumericInput,
  type NumericInputValue,
} from "@/components/ui/numeric-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HARD_PITY, type RecruitmentKind } from "@/lib/recruitment";
import { cn } from "@/lib/utils";

type FormSectionProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function FormSection({ title, action, children }: FormSectionProps) {
  return (
    <section className="flex flex-col gap-4 border-t pt-4">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>

      {children}
    </section>
  );
}

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>

      {children}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

type DatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
};

export function DatePicker({ value, onChange }: DatePickerProps) {
  const format = useFormatter();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="justify-between font-normal"
        >
          {format.dateTime(value, {
            dateStyle: "medium",
          })}
          <CalendarIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          captionLayout="dropdown"
          onSelect={(date) => {
            if (date) {
              // The calendar gives midnight. Use the current time of day, so
              // sessions logged on the same day keep the order they were added in.
              const now = new Date();

              date.setHours(
                now.getHours(),
                now.getMinutes(),
                now.getSeconds(),
                now.getMilliseconds(),
              );

              onChange(date);
            }

            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type PoolFieldsProps = {
  kind: RecruitmentKind;
  startCharge: NumericInputValue;
  onStartChargeChange: (value: NumericInputValue) => void;
  pulls: NumericInputValue;
  onPullsChange: (value: NumericInputValue) => void;
};

/** The starting charge and pull count of one banner type. */
export function PoolFields({
  kind,
  startCharge,
  onStartChargeChange,
  pulls,
  onPullsChange,
}: PoolFieldsProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <PoolMark kind={kind} />
        {t(`tools.recruitment.${kind}`)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={t("tools.recruitment.startCharge")}
          htmlFor={`session-${kind}-start`}
        >
          <NumericInput
            id={`session-${kind}-start`}
            min={0}
            max={HARD_PITY}
            value={startCharge}
            onValueChange={onStartChargeChange}
          />
        </Field>

        <Field
          label={t("tools.recruitment.pulls")}
          htmlFor={`session-${kind}-pulls`}
        >
          <NumericInput
            id={`session-${kind}-pulls`}
            min={0}
            value={pulls}
            onValueChange={onPullsChange}
          />
        </Field>
      </div>
    </div>
  );
}
