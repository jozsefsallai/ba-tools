import { Storage } from "@/lib/storage";
import type { StarLevel, UELevel } from "@/lib/types";

export type StudentStorageItem = {
  id: string;
  level?: number;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
};

export type StudentStorageData = StudentStorageItem[];

class StudentStorage extends Storage<StudentStorageData> {
  constructor() {
    super("students");
  }

  addOrUpdateStudent(item: StudentStorageItem) {
    const current = this.get() ?? [];
    const index = current.findIndex((i) => i.id === item.id);

    if (index === -1) {
      current.push(item);
    } else {
      current[index] = {
        ...current[index],
        ...item,
      };
    }

    this.set(current);
  }

  getStudent(id: string): StudentStorageItem | undefined {
    return this.get()?.find((i) => i.id === id);
  }
}

export const studentStorage = new StudentStorage();
