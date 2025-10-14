import type { Student } from "@prisma/client";
import { createContext, useContext } from "react";

export type StudentsContext = {
  students: Student[];
};

export const studentsContext = createContext<StudentsContext>({
  students: [],
});

export function useStudents() {
  const context = useContext(studentsContext);
  return context;
}
