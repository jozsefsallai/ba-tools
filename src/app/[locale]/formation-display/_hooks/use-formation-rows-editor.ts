"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import type {
  EditableConfig,
  StudentItem,
} from "@/app/[locale]/formation-display/_components/formation-preview";
import { useUserPreferences } from "@/hooks/use-preferences";
import {
  DEFAULT_NEW_FORMATION_STUDENT_STAR_LEVEL,
  type FormationEditorRow,
} from "@/lib/formation-display-utils";
import {
  type FormationType,
  resolveStarterOrders,
  TACTICAL_RELAY_STRIKER_MAX,
} from "@/lib/formation-type";
import type { Student } from "@/lib/types";

export type UseFormationRowsEditorOptions = {
  rows: FormationEditorRow[];
  setRows: Dispatch<SetStateAction<FormationEditorRow[]>>;
  formationType: FormationType | undefined;
  formationId: string | null | undefined;
};

export function useFormationRowsEditor({
  rows,
  setRows,
  formationType,
  formationId,
}: UseFormationRowsEditorOptions) {
  const { preferences } = useUserPreferences();

  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // TCS is only ever chosen manually, so the explicit type is enough here.
  function strikersOverflowToTcs(row: FormationEditorRow) {
    return (
      formationType === "tacticalRelay" &&
      row.strikers.length >= TACTICAL_RELAY_STRIKER_MAX
    );
  }

  function addStudent(student: Student) {
    const item: StudentItem = {
      id: uuid(),
      student,
      ...(preferences.formationDisplay.defaultLevelEnabled
        ? {
            level: preferences.formationDisplay.defaultLevel,
          }
        : {}),
      ...(!formationId
        ? {
            starLevel: DEFAULT_NEW_FORMATION_STUDENT_STAR_LEVEL,
          }
        : {}),
    };

    setRows((prev) => {
      const row = prev[activeRowIndex];
      if (!row) {
        return prev;
      }

      if (student.combatClass === "Main") {
        if (
          row.strikers.find((i) => i.student?.id === student.id) ||
          row.tcs.find((i) => i.student?.id === student.id)
        ) {
          return prev;
        }

        if (strikersOverflowToTcs(row)) {
          return prev.map((r, i) =>
            i === activeRowIndex
              ? {
                  ...r,
                  tcs: [
                    ...r.tcs,
                    item,
                  ],
                }
              : r,
          );
        }

        return prev.map((r, i) =>
          i === activeRowIndex
            ? {
                ...r,
                strikers: [
                  ...r.strikers,
                  item,
                ],
              }
            : r,
        );
      }

      if (student.combatClass === "Support") {
        if (row.specials.find((i) => i.student?.id === student.id)) {
          return prev;
        }

        return prev.map((r, i) =>
          i === activeRowIndex
            ? {
                ...r,
                specials: [
                  ...r.specials,
                  item,
                ],
              }
            : r,
        );
      }

      return prev;
    });
  }

  const removeItem = useCallback(
    (itemId: string) => {
      setSelectedItemId((prev) => (prev === itemId ? null : prev));
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          strikers: row.strikers.filter((item) => item.id !== itemId),
          specials: row.specials.filter((item) => item.id !== itemId),
          tcs: row.tcs.filter((item) => item.id !== itemId),
        })),
      );
    },
    [
      setRows,
    ],
  );

  const updateItem = useCallback(
    (itemId: string, newData: Partial<Omit<StudentItem, "student" | "id">>) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.tcs.some((candidate) => candidate.id === itemId)) {
            const {
              starter: _starter,
              starterOrder: _order,
              ...tcsData
            } = newData;

            return {
              ...row,
              tcs: row.tcs.map((candidate) =>
                candidate.id === itemId
                  ? {
                      ...candidate,
                      ...tcsData,
                    }
                  : candidate,
              ),
            };
          }

          const rowItems = [
            ...row.strikers,
            ...row.specials,
          ];
          const item = rowItems.find((candidate) => candidate.id === itemId);

          if (!item) {
            return row;
          }

          const isEnablingStarter = newData.starter === true && !item.starter;
          const isDisablingStarter = newData.starter === false && item.starter;
          let effectiveData = newData;
          if (isEnablingStarter) {
            const starterCount = rowItems.filter(
              (candidate) => candidate.starter,
            ).length;

            effectiveData = {
              ...newData,
              starterOrder: starterCount + 1,
            };
          }

          const updatedItems = rowItems.map((candidate) =>
            candidate.id === itemId
              ? {
                  ...candidate,
                  ...effectiveData,
                }
              : candidate,
          );

          if (isEnablingStarter || isDisablingStarter) {
            const resolvedOrders = isEnablingStarter
              ? resolveStarterOrders(rowItems)
              : resolveStarterOrders(updatedItems);
            const nextStarterOrder = new Map(resolvedOrders);

            if (isEnablingStarter) {
              nextStarterOrder.set(
                itemId,
                rowItems.filter((candidate) => candidate.starter).length + 1,
              );
            }

            for (let i = 0; i < updatedItems.length; i++) {
              const candidate = updatedItems[i];
              if (!candidate) {
                continue;
              }

              updatedItems[i] = candidate.starter
                ? {
                    ...candidate,
                    starterOrder: nextStarterOrder.get(candidate.id),
                  }
                : candidate;
            }
          }

          return {
            ...row,
            strikers: updatedItems.filter((candidate) =>
              row.strikers.some((item) => item.id === candidate.id),
            ),
            specials: updatedItems.filter((candidate) =>
              row.specials.some((item) => item.id === candidate.id),
            ),
          };
        }),
      );
    },
    [
      setRows,
    ],
  );

  function addEmptyCard(combatClass: "striker" | "special") {
    const item: StudentItem = {
      id: uuid(),
    };

    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== activeRowIndex) {
          return row;
        }

        if (combatClass === "striker") {
          if (strikersOverflowToTcs(row)) {
            return {
              ...row,
              tcs: [
                ...row.tcs,
                item,
              ],
            };
          }

          return {
            ...row,
            strikers: [
              ...row.strikers,
              item,
            ],
          };
        }

        return {
          ...row,
          specials: [
            ...row.specials,
            item,
          ],
        };
      }),
    );
  }

  function addFormationRow() {
    const newIndex = rows.length;
    setRows((prev) => [
      ...prev,
      {
        id: uuid(),
        strikers: [],
        specials: [],
        tcs: [],
      },
    ]);
    setActiveRowIndex(newIndex);
  }

  function removeFormationRow() {
    if (rows.length <= 1) {
      return;
    }

    const idx = activeRowIndex;
    const next = rows.filter((_, i) => i !== idx);
    setRows(next);
    setActiveRowIndex(Math.min(idx, next.length - 1));
  }

  const editableConfigByRow = useMemo((): EditableConfig[] => {
    return rows.map((_, rowIndex) => ({
      selectedItemId,
      onItemSelected: setSelectedItemId,
      setStrikers: (action: SetStateAction<StudentItem[]>) => {
        setRows((prev) => {
          const row = prev[rowIndex];
          if (!row) {
            return prev;
          }

          const nextStrikers =
            typeof action === "function" ? action(row.strikers) : action;

          return prev.map((r, i) =>
            i === rowIndex
              ? {
                  ...r,
                  strikers: nextStrikers,
                }
              : r,
          );
        });
      },
      setSpecials: (action: SetStateAction<StudentItem[]>) => {
        setRows((prev) => {
          const row = prev[rowIndex];
          if (!row) {
            return prev;
          }

          const nextSpecials =
            typeof action === "function" ? action(row.specials) : action;

          return prev.map((r, i) =>
            i === rowIndex
              ? {
                  ...r,
                  specials: nextSpecials,
                }
              : r,
          );
        });
      },
      setTcs: (action: SetStateAction<StudentItem[]>) => {
        setRows((prev) => {
          const row = prev[rowIndex];
          if (!row) {
            return prev;
          }

          const nextTcs =
            typeof action === "function" ? action(row.tcs) : action;

          return prev.map((r, i) =>
            i === rowIndex
              ? {
                  ...r,
                  tcs: nextTcs,
                }
              : r,
          );
        });
      },
      onWantsToRemove: removeItem,
      onWantsToUpdate: updateItem,
    }));
  }, [
    rows,
    selectedItemId,
    removeItem,
    updateItem,
    setRows,
  ]);

  return {
    activeRowIndex,
    setActiveRowIndex,
    addStudent,
    removeItem,
    updateItem,
    addEmptyCard,
    addFormationRow,
    removeFormationRow,
    editableConfigByRow,
  };
}
