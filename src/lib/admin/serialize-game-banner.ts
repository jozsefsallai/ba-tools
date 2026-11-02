import type { GameBanner, Student } from "~prisma";

export function serializeGameBanner(
  banner: GameBanner & {
    pickupStudents: Student[];
  },
) {
  return {
    id: banner.id,
    name: banner.name,
    startDate: banner.startDate.toISOString(),
    endDate: banner.endDate.toISOString(),
    freePulls: banner.freePulls,
    isSelectablePickup: banner.isSelectablePickup,
    createdAt: banner.createdAt.toISOString(),
    updatedAt: banner.updatedAt.toISOString(),
    pickupStudents: banner.pickupStudents,
  };
}
