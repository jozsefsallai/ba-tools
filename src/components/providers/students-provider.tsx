"use client";

import { studentsContext } from "@/hooks/use-students";
import type { Student } from "@prisma/client";
import { type PropsWithChildren, useMemo, useState } from "react";

export function StudentsProvider({
  loadedStudents,
  children,
}: PropsWithChildren<{
  loadedStudents: Student[];
}>) {
  const [students] = useState(loadedStudents);

  const studentMap = useMemo(() => {
    const map: Record<string, Student> = {};

    for (const student of students) {
      map[student.id] = student;
    }

    return map;
  }, [students]);

  return (
    <studentsContext.Provider value={{ students, studentMap }}>
      {children}
    </studentsContext.Provider>
  );
}
