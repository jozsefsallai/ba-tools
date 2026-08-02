export type UserPreferences = {
  timelineVisualizer: {
    triggerAutoFocus: boolean;
    defaultScale: number;
    defaultItemSpacing: number;
    defaultVerticalSeparatorSize: number;
    defaultHorizontalSeparatorSize: number;
    defaultExportWithTransparentBackground: boolean;
    defaultExportBackgroundColor: string;
    defaultExportBackgroundOpacity: number;
  };
  formationDisplay: {
    defaultScale: number;
    defaultDisplayOverline: boolean;
    defaultNoDisplayRole: boolean;
    defaultGroupsVertical: boolean;
    defaultRowGap: number;
  };
  bond: {
    autoPopulateSingleTargetGifts: boolean;
  };
};

export const defaultUserPreferences: UserPreferences = {
  timelineVisualizer: {
    triggerAutoFocus: false,
    defaultScale: 1,
    defaultItemSpacing: 10,
    defaultVerticalSeparatorSize: 70,
    defaultHorizontalSeparatorSize: 50,
    defaultExportWithTransparentBackground: true,
    defaultExportBackgroundColor: "#000000",
    defaultExportBackgroundOpacity: 100,
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
