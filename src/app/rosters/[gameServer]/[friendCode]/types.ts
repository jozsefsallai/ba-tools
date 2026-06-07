import type { Doc } from "~convex/dataModel";
import type { Student } from "~prisma";

export type RosterStudentData = Doc<"roster">["students"][number] & {
  student: Student;
};

export type RosterStudentsSortOption =
  | "default"
  | "nameAsc"
  | "nameDesc"
  | "levelAsc"
  | "levelDesc"
  | "relationshipRankAsc"
  | "relationshipRankDesc"
  | "atkTalentAsc"
  | "atkTalentDesc"
  | "hpTalentAsc"
  | "hpTalentDesc"
  | "healTalentAsc"
  | "healTalentDesc";
