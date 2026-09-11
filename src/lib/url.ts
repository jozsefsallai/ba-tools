import type { Student } from "@/lib/types";

export function buildCDNUrl(key: string) {
  return `${process.env.NEXT_PUBLIC_IMAGE_CDN_URL}/${key}`;
}

export function buildCDNAbsoluteUrl(key: string) {
  return `${process.env.NEXT_PUBLIC_IMAGE_CDN_URL}/${key}`;
}

export function buildStudentIconUrlFromId(studentId: string) {
  return buildCDNUrl(`v2/images/students/icons/${studentId}.png`);
}

export function buildStudentPortraitUrlFromId(studentId: string) {
  return buildCDNUrl(`v2/images/students/portraits/${studentId}.png`);
}

export function buildStudentIconUrl(student: Pick<Student, "id">) {
  return buildStudentIconUrlFromId(student.id);
}

export function buildStudentPortraitUrl(student: Pick<Student, "id">) {
  return buildStudentPortraitUrlFromId(student.id);
}

export function buildItemIconUrl(iconName: string) {
  return buildCDNUrl(`v2/images/items/${iconName}.webp`);
}

export function buildSkillPortraitUrl(student: Pick<Student, "devName">) {
  return buildCDNUrl(
    `v2/images/skill-portraits/Skill_Portrait_${student.devName}.png`,
  );
}

export function buildAlternativeSkillPortraitUrl(key: string) {
  return buildCDNUrl(`v2/images/skill-portraits/${key}.png`);
}
