import type { StarLevel, UELevel } from "@/lib/types";
import type { Student } from "~prisma";

export type PVPFormationStudentItem = {
  student?: Student;
  level?: number;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  damage?: number;
};

export type PVPMatchType = "attack" | "defense";

export type PVPMatchResult = "win" | "loss";
