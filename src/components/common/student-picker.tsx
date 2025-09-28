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
import { commandScore } from "@/lib/text-score";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Student } from "@prisma/client";
import { PopoverContent } from "@radix-ui/react-popover";
import {
  type PropsWithChildren,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

export type StudentPickerHandle = {
  open(): void;
};

export type StudentPickerProps<T extends Student> = PropsWithChildren<{
  students: T[];
  onStudentSelected?: (student: T) => void | Promise<void>;
  className?: string;
  placeholder?: string;
  noStudentText?: string;
  ref?: React.Ref<StudentPickerHandle>;
}>;

export function StudentPicker<T extends Student>({
  students,
  onStudentSelected,
  className,
  placeholder,
  noStudentText = "No such student.",
  children,
  ref,
}: StudentPickerProps<T>) {
  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const hackRef = useRef<HTMLDivElement>(null);

  const filteredStudents = useMemo(() => {
    if (!searchInput) {
      return students;
    }

    const scores = new Map<string, number>();

    return students
      .filter((student) => {
        const score = commandScore(
          student.name,
          searchInput,
          student.searchTags,
        );

        if (score > 0.15) {
          scores.set(student.id, score);
          return true;
        }

        return false;
      })
      .sort((a, b) => {
        const scoreA = scores.get(a.id) ?? 0;
        const scoreB = scores.get(b.id) ?? 0;

        if (scoreA === scoreB) {
          return a.name.localeCompare(b.name);
        }

        return scoreB - scoreA;
      });
  }, [students, searchInput]);

  function handleInputChange(value: string) {
    setTimeout(() => {
      hackRef.current?.scrollIntoView();
    }, 0);

    setSearchInput(value);
  }

  function openAndStartTyping(e: React.KeyboardEvent) {
    if (studentPopoverOpen) {
      return;
    }

    if (e.key.length === 1 && e.key.match(/\S/)) {
      setStudentPopoverOpen(true);
      setSearchInput(e.key);
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      open() {
        setStudentPopoverOpen(true);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!studentPopoverOpen) {
      setSearchInput("");
    }
  }, [studentPopoverOpen]);

  return (
    <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
      <PopoverTrigger asChild onKeyDown={openAndStartTyping}>
        {children}
      </PopoverTrigger>

      <PopoverContent
        className={cn("z-10 p-0 border rounded-md mt-1", className)}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            className="h-9"
            value={searchInput}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <div ref={hackRef} />

            <CommandEmpty>{noStudentText}</CommandEmpty>
            <CommandGroup>
              {filteredStudents.map((student) => (
                <CommandItem
                  key={student.id}
                  value={student.name}
                  keywords={student.searchTags}
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
