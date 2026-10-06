import type { PvpUnitImport } from "@/lib/pvp";
import type {
  PVPCounterRange,
  PVPFormationPresetType,
  StarLevel,
  UELevel,
} from "@/lib/types";
import type { Student } from "~prisma";

export type {
  PVPFormationPresetType,
  PVPMatchType,
} from "@/lib/types";

export type PVPFormationStudentItem = {
  report?: PvpUnitImport;
  student?: Student;
  level?: number;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  damage?: number;
  counter?: { kind: "range"; value: PVPCounterRange } | { kind: "tank" };
};

export type PVPFormationStudentRecord = {
  studentId?: string;
  level?: number;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
};

export type PVPEnemyTeam = {
  teamKey: string;
  team: PVPFormationStudentRecord[];
  roles: PVPFormationPresetType;
  encounterCounts: {
    attack: number;
    defense: number;
    total: number;
  };
  updatedAt?: number;
  manualTeamId?: string;
};

export type PVPMatchResult = "win" | "loss";
