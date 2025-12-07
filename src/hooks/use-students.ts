import type { Student } from "~prisma";
import { createContext, useContext } from "react";

export type StudentsContext = {
  students: Student[];
  studentMap: Record<string, Student>;
};

export const studentsContext = createContext<StudentsContext>({
  students: [],
  studentMap: {},
});

export function useStudents() {
  const context = useContext(studentsContext);
  return context;
}
