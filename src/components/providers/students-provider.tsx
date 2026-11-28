"use client";

import { type Locale, useLocale } from "next-intl";
import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { studentsContext } from "@/hooks/use-students";
import type { SkillCardVariantData } from "@/lib/skill-card";
import type { Student } from "~prisma";

function getStudentName(student: Student, locale: Locale) {
  switch (locale) {
    case "en":
      return student.name;
    case "ja":
      return student.nameJP;
    default:
      return student.name;
  }
}

export function StudentsProvider({
  loadedStudents,
  skillCardVariants,
  children,
}: PropsWithChildren<{
  loadedStudents: Student[];
  skillCardVariants: Record<string, SkillCardVariantData[]>;
}>) {
  const locale = useLocale();

  const [students, setStudents] = useState(loadedStudents);

  const studentMap = useMemo(() => {
    const map: Record<string, Student> = {};

    for (const student of students) {
      map[student.id] = student;
    }

    return map;
  }, [
    students,
  ]);

  useEffect(() => {
    const newStudents = loadedStudents.slice().map((student) => ({
      ...student,
      name: getStudentName(student, locale),
    }));

    setStudents(newStudents);
  }, [
    locale,
  ]);

  return (
    <studentsContext.Provider
      value={{
        students,
        studentMap,
        skillCardVariants,
      }}
    >
      {children}
    </studentsContext.Provider>
  );
}
