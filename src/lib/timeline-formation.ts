import {
  compareFormationRows,
  type FormationEditorRow,
  formationDocToRows,
  formationRowsToPayload,
  type PersistedFormationRow,
  type PersistedFormationStudentSlot,
} from "@/lib/formation-display-utils";
import type { FormationType } from "@/lib/formation-type";
import type { Student } from "@/lib/types";

export type TimelineFormationData = {
  name?: string;
  type?: FormationType;
  rows: PersistedFormationRow[];
  rowGap?: number;
  displayOverline?: boolean;
  noDisplayRole?: boolean;
  groupsVertical?: boolean;
};

export type TimelineFormationState = {
  id?: string;
  name: string;
  type?: FormationType;
  rows: FormationEditorRow[];
  rowGap?: number;
  displayOverline?: boolean;
  noDisplayRole?: boolean;
  groupsVertical?: boolean;
};

type FormationSource = Omit<TimelineFormationData, "name" | "rows"> & {
  name?: string;
  strikers?: PersistedFormationStudentSlot[];
  specials?: PersistedFormationStudentSlot[];
  rows?: PersistedFormationRow[];
};

export function formationSourceToState(
  source: FormationSource,
  allStudents: Student[],
  id?: string,
): TimelineFormationState {
  return {
    id,
    name: source.name ?? "",
    type: source.type,
    rows: formationDocToRows(source, allStudents),
    rowGap: source.rowGap,
    displayOverline: source.displayOverline,
    noDisplayRole: source.noDisplayRole,
    groupsVertical: source.groupsVertical,
  };
}

export function formationStateToData(
  state: TimelineFormationState,
): TimelineFormationData {
  return {
    name: state.name.length > 0 ? state.name : undefined,
    type: state.type,
    rows: formationRowsToPayload(state.rows, state.type),
    rowGap: state.rowGap,
    displayOverline: state.displayOverline,
    noDisplayRole: state.noDisplayRole,
    groupsVertical: state.groupsVertical,
  };
}

export function hasFormationSlots(state: TimelineFormationState | null) {
  return (
    !!state &&
    state.rows.some(
      (row) =>
        row.strikers.length > 0 ||
        row.specials.length > 0 ||
        row.tcs.length > 0,
    )
  );
}

export function formationStateToStoredData(
  state: TimelineFormationState | null,
) {
  return state && hasFormationSlots(state)
    ? formationStateToData(state)
    : undefined;
}

export function getFormationStudents(state: TimelineFormationState | null) {
  const students = new Map<string, Student>();

  for (const row of state?.rows ?? []) {
    for (const item of [
      ...row.strikers,
      ...row.specials,
      ...row.tcs,
    ]) {
      if (item.student) {
        students.set(item.student.id, item.student);
      }
    }
  }

  return Array.from(students.values());
}

export function compareFormationStates(
  a: TimelineFormationState | null,
  b: TimelineFormationState | null,
) {
  if (!hasFormationSlots(a) || !hasFormationSlots(b)) {
    return hasFormationSlots(a) === hasFormationSlots(b);
  }

  if (!a || !b) {
    return false;
  }

  return (
    a.id === b.id &&
    a.name === b.name &&
    a.type === b.type &&
    a.rowGap === b.rowGap &&
    !!a.displayOverline === !!b.displayOverline &&
    !!a.noDisplayRole === !!b.noDisplayRole &&
    !!a.groupsVertical === !!b.groupsVertical &&
    compareFormationRows(a.rows, b.rows)
  );
}

export function formationDiffersFromSource(
  state: TimelineFormationState,
  source: FormationSource,
  allStudents: Student[],
) {
  return !compareFormationStates(
    state,
    formationSourceToState(source, allStudents, state.id),
  );
}
