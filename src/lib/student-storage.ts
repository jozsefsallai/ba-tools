import type { StarLevel, UELevel } from "@/lib/types";

export type StudentStorageItem = {
  id: string;
  level?: number;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
};

export function getStudentStorage(): StudentStorageItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const data = localStorage.getItem("jbat_students");
  return data ? JSON.parse(data) : [];
}

export function setStudentStorage(data: StudentStorageItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("jbat_students", JSON.stringify(data));
}

export function addOrUpdateStudentInStorage(item: StudentStorageItem) {
  const current = getStudentStorage();
  const index = current.findIndex((i) => i.id === item.id);

  if (index === -1) {
    current.push(item);
  } else {
    current[index] = {
      ...current[index],
      ...item,
    };
  }

  setStudentStorage(current);
}

export function getStudentFromStorage(
  id: string,
): StudentStorageItem | undefined {
  return getStudentStorage().find((i) => i.id === id);
}

export function clearStudentStorage() {
  localStorage.removeItem("jbt_students");
}
