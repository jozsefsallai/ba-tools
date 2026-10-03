import type {
  AttackType,
  Club,
  CombatClass,
  CombatPosition,
  CombatRole,
  DefenseType,
  EquipmentKind,
  School,
  WeaponType,
} from "../../lib/db/client";

import axios from "axios";

const STUDENTS_TABLE = "https://schaledb.com/data/en/students.min.json";
const STUDENTS_TABLE_JP = "https://schaledb.com/data/jp/students.min.json";
const STUDENTS_TABLE_KR = "https://schaledb.com/data/kr/students.min.json";
const STUDENTS_TABLE_TW = "https://schaledb.com/data/tw/students.min.json";
const STUDENTS_TABLE_TH = "https://schaledb.com/data/th/students.min.json";

type PerServerAttribute<T> = [jp: T, global: T, cn: T];

export enum StudentLimitedType {
  Permanent = 0,
  Limited = 1,
  Welfare = 2,
  Fest = 3,
  Archive = 4,
}

export type RawEffect = {
  Type: string;
  Scale: number[];
};

export type RawExSkill = {
  Name: string;
  Desc: string;
  Parameters: Array<string[]>;
  Cost?: number[];
  ExtraSkills?: Array<RawExSkill>;
  Effects: Array<RawEffect>;
};

export type RawPassiveSkill = {
  Name: string;
  Desc: string;
  Parameters: Array<string[]>;
  Effects: Array<RawEffect>;
};

export type RawStudentSkillsData = {
  Ex: RawExSkill; // EX skill
  Public: RawPassiveSkill; // Normal skill
  Passive: RawPassiveSkill; // Enhanced skill
  ExtraPassive: RawPassiveSkill; // Subskill
};

export type RawGearData = {
  Released?: PerServerAttribute<boolean>; // JP, Global, CN
  StatType?: string;
  StatValue?: number[];
  Name?: string;
  Desc?: string;
  TierUpMaterial?: number[][];
  TierUpMaterialAmount?: number[][];
};

export type RawStudentData = {
  Id: number;
  DefaultOrder: number;
  IsReleased: PerServerAttribute<boolean>; // JP, Global, CN
  PathName: string;
  DevName: string;
  Name: string;
  School: School;
  Club: Club;
  StarGrade: number;
  SquadType: CombatClass;
  TacticRole: CombatRole;
  Position: CombatPosition;
  BulletType: AttackType;
  ArmorType: DefenseType;
  StreetBattleAdaptation: number;
  OutdoorBattleAdaptation: number;
  IndoorBattleAdaptation: number;
  WeaponType: WeaponType;
  Cover: boolean;
  Equipment: EquipmentKind[];
  FamilyName: string;
  PersonalName: string;
  CharacterAge: string;
  Birthday: string;
  ProfileIntroduction: string;
  Hobby: string;
  CharacterVoice: string;
  Illustrator: string;
  Designer: string;
  CharHeightMetric: string;
  Skills: RawStudentSkillsData;
  MemoryLobby: number[];
  FavorItemTags: string[];
  FavorItemUniqueTags: string[];
  IsLimited: PerServerAttribute<StudentLimitedType>;
  LinkedCharacterId?: number | null;
  SearchTags: string[];
  Gear?: RawGearData;
  StabilityPoint?: number;
  AttackPower1?: number;
  AttackPower100?: number;
  MaxHP1?: number;
  MaxHP100?: number;
  DefensePower1?: number;
  DefensePower100?: number;
  HealPower1?: number;
  HealPower100?: number;
  DodgePoint?: number;
  AccuracyPoint?: number;
  CriticalPoint?: number;
  CriticalDamageRate?: number;
  AmmoCount?: number;
  AmmoCost?: number;
  Range?: number;
  SightPoint?: number;
  RegenCost?: number;
};

export async function fetchStudentsData(): Promise<
  Record<string, RawStudentData>
> {
  const response = await axios.get(STUDENTS_TABLE);
  return response.data;
}

export async function fetchStudentsDataJP(): Promise<
  Record<string, RawStudentData>
> {
  const response = await axios.get(STUDENTS_TABLE_JP);
  return response.data;
}

export async function fetchStudentsDataKR(): Promise<
  Record<string, RawStudentData>
> {
  const response = await axios.get(STUDENTS_TABLE_KR);
  return response.data;
}

export async function fetchStudentsDataTW(): Promise<
  Record<string, RawStudentData>
> {
  const response = await axios.get(STUDENTS_TABLE_TW);
  return response.data;
}

export async function fetchStudentsDataTH(): Promise<
  Record<string, RawStudentData>
> {
  const response = await axios.get(STUDENTS_TABLE_TH);
  return response.data;
}
