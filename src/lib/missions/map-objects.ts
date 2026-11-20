import type { MissionObjectType } from "@/lib/game-data/contract";

/** Tiles echelons can be deployed on; `FixedStartNN` counts too. */
export const isStartObject = (type: MissionObjectType) =>
  type === "Start" || type.startsWith("FixedStart");

/** The Pyroxene box on Hard missions. */
export const isBoxObject = (type: MissionObjectType) =>
  type === "Parcel" || type === "ParcelOneTimePerAccount";
