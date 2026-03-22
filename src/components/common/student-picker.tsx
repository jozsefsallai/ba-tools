"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStudents } from "@/hooks/use-students";
import { orderStudentsByFuzzyNameQuery } from "@/lib/student-search-query";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import React, {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { VList } from "virtua";
import type { Student } from "~prisma";

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
  student,
  handleStudentSelected,
}: {
  student: Student;
  handleStudentSelected: (student: Student) => void;
}) {
  const iconUrl = useMemo(() => {
    return buildStudentIconUrl(student);
  }, [student]);

  return (
    <CommandItem
      value={student.name}
      keywords={student.searchTags}
      onSelect={() => handleStudentSelected(student)}
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
    noStudentText,
    children,
    ref,
  }: StudentPickerProps) => {
    const t = useTranslations();

    const { students } = useStudents();

    const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");

    const hackRef = useRef<HTMLDivElement>(null);

    const finalNoStudentText = noStudentText ?? t("common.studentPicker.zds");

    const filteredStudents = useMemo(() => {
      if (!searchInput) {
        return students;
      }

      return orderStudentsByFuzzyNameQuery(students, searchInput.trim())
        .ordered;
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

              <CommandEmpty>{finalNoStudentText}</CommandEmpty>
              <CommandGroup>
                <VList style={{ height: 290 }}>
                  {filteredStudents.map((student) => (
                    <StudentItem
                      key={student.id}
                      student={student}
                      handleStudentSelected={handleStudentSelected}
                    />
                  ))}
                </VList>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
