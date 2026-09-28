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
    defaultVisibility: "private" | "public";
    defaultShowCreator: boolean;
  };
  formationDisplay: {
    defaultScale: number;
    defaultDisplayOverline: boolean;
    defaultNoDisplayRole: boolean;
    defaultGroupsVertical: boolean;
    defaultRowGap: number;
    defaultLevelEnabled: boolean;
    defaultLevel: number;
  };
  bond: {
    autoPopulateSingleTargetGifts: boolean;
  };
  pvp: {
    hideEmptyAgendaDays: boolean;
    includeMatchesInStatisticsByDefault: boolean;
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
    defaultVisibility: "private",
    defaultShowCreator: false,
  },
  formationDisplay: {
    defaultScale: 1,
    defaultDisplayOverline: false,
    defaultNoDisplayRole: false,
    defaultGroupsVertical: false,
    defaultRowGap: 8,
    defaultLevelEnabled: true,
    defaultLevel: 90,
  },
  bond: {
    autoPopulateSingleTargetGifts: false,
  },
  pvp: {
    hideEmptyAgendaDays: false,
    includeMatchesInStatisticsByDefault: false,
  },
};
