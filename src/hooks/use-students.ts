import { createContext, useContext } from "react";
import type { SkillCardVariantData } from "@/lib/skill-card";
import type { Student } from "~prisma";

export type StudentsContext = {
  students: Student[];
  studentMap: Record<string, Student>;
  skillCardVariants: Record<string, SkillCardVariantData[]>;
};

export const studentsContext = createContext<StudentsContext>({
  students: [],
  studentMap: {},
  skillCardVariants: {},
});

export function useStudents() {
  const context = useContext(studentsContext);
  return context;
}

const NO_VARIANTS: SkillCardVariantData[] = [];

export function useSkillCardVariants(studentId: string | undefined) {
  const { skillCardVariants } = useContext(studentsContext);
  return (studentId && skillCardVariants[studentId]) || NO_VARIANTS;
}
