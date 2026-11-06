import type { UserPreferences } from "@/lib/user-preferences";
import { defaultUserPreferences } from "@/lib/user-preferences";

type Slot = {
  studentId?: string;
  level?: number;
};

type Row = Record<string, unknown> & {
  strikers?: Slot[];
  specials?: Slot[];
  tcs?: Slot[];
};

type FormationLike = Row & {
  rows?: Row[];
};

const SLOT_GROUPS = [
  "strikers",
  "specials",
  "tcs",
] as const;

type StoredPreferences = {
  [K in keyof UserPreferences]?: Partial<UserPreferences[K]>;
};

export function resolvePreferences(stored: StoredPreferences): UserPreferences {
  return {
    timelineVisualizer: {
      ...defaultUserPreferences.timelineVisualizer,
      ...stored.timelineVisualizer,
    },
    formationDisplay: {
      ...defaultUserPreferences.formationDisplay,
      ...stored.formationDisplay,
    },
    bond: {
      ...defaultUserPreferences.bond,
      ...stored.bond,
    },
    pvp: {
      ...defaultUserPreferences.pvp,
      ...stored.pvp,
    },
  };
}

export function timelineDefaults({ timelineVisualizer }: UserPreferences) {
  return {
    visibility: timelineVisualizer.defaultVisibility,
    showCreator: timelineVisualizer.defaultShowCreator,
    itemSpacing: timelineVisualizer.defaultItemSpacing,
    verticalSeparatorSize: timelineVisualizer.defaultVerticalSeparatorSize,
    horizontalSeparatorSize: timelineVisualizer.defaultHorizontalSeparatorSize,
    exportWithTransparentBackground:
      timelineVisualizer.defaultExportWithTransparentBackground,
    exportBackgroundColor: timelineVisualizer.defaultExportBackgroundColor,
    exportBackgroundOpacity: timelineVisualizer.defaultExportBackgroundOpacity,
  };
}

export function formationDefaults({ formationDisplay }: UserPreferences) {
  return {
    rowGap: formationDisplay.defaultRowGap,
    displayOverline: formationDisplay.defaultDisplayOverline,
    noDisplayRole: formationDisplay.defaultNoDisplayRole,
    groupsVertical: formationDisplay.defaultGroupsVertical,
  };
}

function rowsOf(formation: FormationLike) {
  return [
    formation,
    ...(formation.rows ?? []),
  ];
}

function studentIdsIn(formation?: FormationLike) {
  if (!formation) {
    return new Set<string>();
  }

  return new Set(
    rowsOf(formation).flatMap((row) =>
      SLOT_GROUPS.flatMap((group) =>
        (row[group] ?? []).flatMap(({ studentId }) =>
          studentId
            ? [
                studentId,
              ]
            : [],
        ),
      ),
    ),
  );
}

export function withDefaultLevels<T extends FormationLike>(
  formation: T,
  { formationDisplay }: UserPreferences,
  current?: FormationLike,
): T {
  if (!formationDisplay.defaultLevelEnabled) {
    return formation;
  }

  const known = studentIdsIn(current);

  const fillRow = <R extends Row>(row: R): R => {
    const filled: Row = {
      ...row,
    };

    for (const group of SLOT_GROUPS) {
      filled[group] = row[group]?.map((slot) =>
        slot.studentId && slot.level === undefined && !known.has(slot.studentId)
          ? {
              ...slot,
              level: formationDisplay.defaultLevel,
            }
          : slot,
      );

      if (filled[group] === undefined) {
        delete filled[group];
      }
    }

    return filled as R;
  };

  return {
    ...fillRow(formation),
    ...(formation.rows && {
      rows: formation.rows.map(fillRow),
    }),
  };
}
