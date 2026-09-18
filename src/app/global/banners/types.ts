import type { Student } from "~prisma";

export type PublicBannerStudent = {
  id: string;
  devName: string;
  schaleDbId: number;
  name: string;
  lastName: string;
  firstName: string;
  combatRole: Student["combatRole"];
  attackType: Student["attackType"];
  rarity: number;
  isFestGlobal: boolean;
  isLimitedGlobal: boolean;
};

export type PublicGameBanner = {
  id: string;
  name: string | null;
  startDate: Date;
  endDate: Date;
  freePulls: number;
  isSelectablePickup: boolean;
  createdAt: Date;
  updatedAt: Date;
  pickupStudents: PublicBannerStudent[];
};

export type BannerGroups = Map<string, Array<PublicGameBanner>>;

export type BannerStudent = PublicBannerStudent;
