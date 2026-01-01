"use client";

import { studentsContext } from "@/hooks/use-students";
import type { Student } from "~prisma";
import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { type Locale, useLocale } from "next-intl";

function getStudentName(student: Student, locale: Locale) {
  switch (locale) {
    case "en":
      return student.name;
    case "jp":
      return student.nameJP;
    default:
      return student.name;
  }
}

export function StudentsProvider({
  loadedStudents,
  children,
}: PropsWithChildren<{
  loadedStudents: Student[];
}>) {
  const locale = useLocale();

  const [students, setStudents] = useState(loadedStudents);

  const studentMap = useMemo(() => {
    const map: Record<string, Student> = {};

    for (const student of students) {
      map[student.id] = student;
    }

    return map;
  }, [students]);

  useEffect(() => {
    const newStudents = loadedStudents.slice().map((student) => ({
      ...student,
      name: getStudentName(student, locale),
    }));

    setStudents(newStudents);
  }, [locale]);

  return (
    <studentsContext.Provider value={{ students, studentMap }}>
      {children}
    </studentsContext.Provider>
  );
}
