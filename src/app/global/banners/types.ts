import type { GameBanner, Student } from "~prisma";

export type BannerGroups = Map<
  string,
  Array<
    GameBanner & {
      pickupStudents: Student[];
    }
  >
>;
