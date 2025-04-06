import type { Student } from "@/lib/types";

export function buildCDNUrl(key: string) {
  return `/cdn/${key}`;
}

export function buildStudentIconUrl(student: Student) {
  return buildCDNUrl(`v2/images/students/icons/${student.id}.png`);
}

export function buildStudentPortraitUrl(student: Student) {
  return buildCDNUrl(`v2/images/students/portraits/${student.id}.png`);
}

export function buildItemIconUrl(iconName: string) {
  return buildCDNUrl(`v2/images/items/${iconName}.webp`);
}
