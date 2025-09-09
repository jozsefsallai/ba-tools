import type { GameBanner, Student } from "@prisma/client";

export type BannerGroups = Map<
  string,
  Array<
    GameBanner & {
      pickupStudents: Student[];
    }
  >
>;
