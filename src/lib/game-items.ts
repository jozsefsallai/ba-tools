import type { ParcelType } from "~prisma";

/** Map key for a `GameItem`, e.g. `Equipment:101003`. */
export const gameItemKey = (parcelType: ParcelType, itemId: number) =>
  `${parcelType}:${itemId}`;
