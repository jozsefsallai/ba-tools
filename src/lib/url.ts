import type { Student } from "@/lib/types";

export function buildCDNUrl(key: string) {
  return `/cdn/${key}`;
}

export function buildStudentIconUrl(student: Student) {
  return buildCDNUrl(`images/students/icons/${student.id}.png`);
}
