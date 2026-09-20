import type { Student } from "~prisma";

export type AdminBanner = {
  id: string;
  name: string | null;
  startDate: string;
  endDate: string;
  freePulls: number;
  isSelectablePickup: boolean;
  createdAt: string;
  updatedAt: string;
  pickupStudents: Student[];
};

export type EmptyBannerGroup = {
  key: string;
  startDate: string;
  endDate: string;
};
