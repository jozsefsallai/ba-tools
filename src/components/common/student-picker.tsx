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
import { useStudents } from "@/hooks/use-students";
import { commandScore } from "@/lib/text-score";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Student } from "@prisma/client";
import { PopoverContent } from "@radix-ui/react-popover";
import React, {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { List, type RowComponentProps } from "react-window";

export type StudentPickerHandle = {
  open(): void;
};

export type StudentPickerProps = PropsWithChildren<{
  onStudentSelected?: (student: Student) => void | Promise<void>;
  className?: string;
  placeholder?: string;
  noStudentText?: string;
  ref?: React.Ref<StudentPickerHandle>;
}>;

function StudentItem({
  students,
  handleStudentSelected,
  index,
  style,
}: RowComponentProps<{
  students: Student[];
  handleStudentSelected: (student: Student) => void;
}>) {
  const student = useMemo(() => students[index], [students, index]);

  const iconUrl = useMemo(() => {
    return buildStudentIconUrl(student);
  }, [student]);

  return (
    <CommandItem
      value={student.name}
      keywords={student.searchTags}
      onSelect={() => handleStudentSelected(student)}
      style={style}
    >
      <div className="flex gap-2 items-center">
        <img src={iconUrl} alt={student.name} className="w-12" />
        {student.name}
      </div>
    </CommandItem>
  );
}

export const StudentPicker = React.memo(
  ({
    onStudentSelected,
    className,
    placeholder,
    noStudentText = "No such student.",
    children,
    ref,
  }: StudentPickerProps) => {
    const { students } = useStudents();

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

    const handleInputChange = useCallback((value: string) => {
      setTimeout(() => {
        hackRef.current?.scrollIntoView();
      }, 0);

      setSearchInput(value);
    }, []);

    const openAndStartTyping = useCallback(
      (e: React.KeyboardEvent) => {
        if (studentPopoverOpen) {
          return;
        }

        if (e.key.length === 1 && e.key.match(/\S/)) {
          setStudentPopoverOpen(true);
          setSearchInput(e.key);
        }
      },
      [studentPopoverOpen],
    );

    const handleStudentSelected = useCallback(
      (student: Student) => {
        onStudentSelected?.(student);
        setStudentPopoverOpen(false);
      },
      [onStudentSelected],
    );

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
                <List
                  rowComponent={StudentItem}
                  rowCount={filteredStudents.length}
                  rowHeight={50}
                  rowProps={{
                    students: filteredStudents,
                    handleStudentSelected: handleStudentSelected,
                  }}
                />
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
