"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

export type DatePickerButtonProps = {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function DatePickerButton({
  value,
  onChange,
  disabled,
  id,
  className,
}: DatePickerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          id={id}
          disabled={disabled}
          className={className}
        >
          {format(value, "MMM d, yyyy")}
          <ChevronDownIcon className="size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          captionLayout="dropdown"
          onSelect={(date) => {
            if (date) {
              onChange(date);
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
