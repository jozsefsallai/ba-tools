"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Student } from "@prisma/client";
import { PopoverContent } from "@radix-ui/react-popover";
import { type PropsWithChildren, useState } from "react";

export type StudentPickerProps<T extends Student> = PropsWithChildren<{
  students: T[];
  onStudentSelected?: (student: T) => void | Promise<void>;
  className?: string;
  placeholder?: string;
  noStudentText?: string;
}>;

export function StudentPicker<T extends Student>({
  students,
  onStudentSelected,
  className,
  placeholder,
  noStudentText = "No such student.",
  children,
}: StudentPickerProps<T>) {
  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);

  return (
    <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent className={cn("p-0 border rounded-md mt-1", className)}>
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{noStudentText}</CommandEmpty>
            <CommandGroup>
              {students.map((student) => (
                <CommandItem
                  key={student.id}
                  value={[student.name, ...student.searchTags].join(":")}
                  onSelect={() => {
                    onStudentSelected?.(student);
                    setStudentPopoverOpen(false);
                  }}
                >
                  <div className="flex gap-2 items-center">
                    <img
                      src={buildStudentIconUrl(student)}
                      alt={student.name}
                      className="w-12"
                    />
                    {student.name}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
