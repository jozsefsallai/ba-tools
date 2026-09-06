"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { buildStudentPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";
import type { Student } from "~prisma";

type PresetOption = {
  _id: string;
  name: string;
  opponentStudentRepId?: string;
  team?: Array<{ studentId?: string }>;
};

export function PVPPresetPicker({
  presets,
  placeholder,
  onSelect,
  className,
  studentMap,
  search,
  onSearchChange,
}: {
  presets: PresetOption[] | undefined;
  placeholder: string;
  onSelect: (id: string) => void;
  className?: string;
  studentMap?: Record<string, Student>;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const loading = presets === undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-between", className)}
          disabled={loading}
        >
          {loading ? "Loading presets..." : placeholder}
          <ChevronsUpDownIcon />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder="Search presets..."
            value={search}
            onValueChange={onSearchChange}
          />

          <CommandList>
            <CommandEmpty>No matching presets.</CommandEmpty>

            {(presets ?? []).map((preset) => (
              <CommandItem
                key={preset._id}
                value={preset.name}
                className="min-h-12 gap-2 px-3 py-2"
                onSelect={() => {
                  onSelect(preset._id);
                  setOpen(false);
                }}
              >
                {preset.opponentStudentRepId &&
                  studentMap?.[preset.opponentStudentRepId] && (
                    <img
                      src={buildStudentPortraitUrl(
                        studentMap[preset.opponentStudentRepId],
                      )}
                      alt=""
                      title={studentMap[preset.opponentStudentRepId].name}
                      className="size-8 rounded-sm object-cover"
                    />
                  )}

                <span className="w-40 truncate">{preset.name}</span>

                {studentMap && (
                  <span className="ml-auto flex shrink-0 gap-0.5">
                    {(preset.team ?? []).map((item, index) => {
                      const student = item.studentId
                        ? studentMap[item.studentId]
                        : undefined;

                      return student ? (
                        <img
                          key={`${preset._id}-${index}`}
                          src={buildStudentPortraitUrl(student)}
                          alt=""
                          title={student.name}
                          className="size-7 rounded-sm object-cover"
                        />
                      ) : (
                        <span
                          key={`${preset._id}-${index}`}
                          className="size-7 rounded-sm border border-dashed"
                        />
                      );
                    })}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
