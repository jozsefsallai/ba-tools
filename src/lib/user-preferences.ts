import type { Doc } from "~convex/dataModel";

export const defaultUserPreferences: Pick<
  Doc<"userPreferences">,
  "formationDisplay" | "timelineVisualizer"
> & {
  bond: {
    autoPopulateSingleTargetGifts: boolean;
  };
} = {
  timelineVisualizer: {
    triggerAutoFocus: false,
    defaultScale: 1,
    defaultItemSpacing: 10,
    defaultVerticalSeparatorSize: 70,
    defaultHorizontalSeparatorSize: 50,
  },
  formationDisplay: {
    defaultScale: 1,
    defaultDisplayOverline: false,
    defaultNoDisplayRole: false,
    defaultGroupsVertical: false,
    defaultRowGap: 8,
  },
  bond: {
    autoPopulateSingleTargetGifts: false,
  },
};

export type UserPreferences = typeof defaultUserPreferences;
