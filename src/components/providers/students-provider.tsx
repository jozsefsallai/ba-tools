"use client";

import { studentsContext } from "@/hooks/use-students";
import type { Student } from "@prisma/client";
import { type PropsWithChildren, useState } from "react";

export function StudentsProvider({
  loadedStudents,
  children,
}: PropsWithChildren<{
  loadedStudents: Student[];
}>) {
  const [students] = useState(loadedStudents);

  return (
    <studentsContext.Provider value={{ students }}>
      {children}
    </studentsContext.Provider>
  );
}
