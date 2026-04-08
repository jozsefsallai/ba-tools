"use client";

import {
  FormationPreview,
  type StudentItem,
} from "@/app/formation-display/_components/formation-preview";
import type { Student } from "@/lib/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { useTranslations } from "next-intl";
import html2canvas from "html2canvas-pro";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ChevronsUpDownIcon, ImportIcon, PlusIcon } from "lucide-react";

import { sleep } from "@/lib/sleep";
import { StudentPicker } from "@/components/common/student-picker";

import type { EditableConfig } from "@/app/formation-display/_components/formation-preview";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryWithStatus } from "@/lib/convex";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import { Authenticated, useMutation } from "convex/react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageBox } from "@/components/common/message-box";
import { clearCache } from "@/lib/cache";
import { v4 as uuid } from "uuid";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/use-preferences";
import { useStudents } from "@/hooks/use-students";
import { useDirtyStateTracker } from "@/hooks/use-dirty-state-tracker";
import { useNavigationGuard } from "next-navigation-guard";
import { SaveDialog } from "@/components/dialogs/save-dialog";
import { SaveStatus } from "@/components/common/save-status";
import { ParseEchelonDataDialog } from "@/components/dialogs/parse-echelon-data-dialog";
import type { EchelonData } from "@/lib/echelon-parser";
import {
  persistedSlotsToStudentItems,
  studentItemsToPersistedSlots,
} from "@/lib/formation-display-utils";

type FormationEditorRow = {
  id: string;
  strikers: StudentItem[];
  specials: StudentItem[];
};

function compareStudentItems(a: StudentItem[], b: StudentItem[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; ++i) {
    const itemA = a[i];
    const itemB = b[i];

    if (itemA.student?.id !== itemB.student?.id) {
      return false;
    }

    if (itemA.starter !== itemB.starter) {
      return false;
    }

    if (itemA.starLevel !== itemB.starLevel) {
      return false;
    }

    if (itemA.ueLevel !== itemB.ueLevel) {
      return false;
    }

    if (itemA.borrowed !== itemB.borrowed) {
      return false;
    }

    if (itemA.level !== itemB.level) {
      return false;
    }
  }

  return true;
}

function compareFormationRows(
  a: FormationEditorRow[],
  b: FormationEditorRow[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; ++i) {
    if (
      !compareStudentItems(a[i].strikers, b[i].strikers) ||
      !compareStudentItems(a[i].specials, b[i].specials)
    ) {
      return false;
    }
  }

  return true;
}

export function FormationEditor() {
  const t = useTranslations();
  const { students: allStudents } = useStudents();

  const { hasUnsavedChanges, useSaveableState, markAsSaved } =
    useDirtyStateTracker();

  const [requestInProgress, setRequestInProgress] = useState(false);

  const navigationGuard = useNavigationGuard({
    enabled: hasUnsavedChanges && !requestInProgress,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const { preferences } = useUserPreferences();

  const [name, setName, setNameUnchecked] = useSaveableState("");

  const [rows, setRows, setRowsUnchecked] = useSaveableState<
    FormationEditorRow[]
  >(
    () => [{ id: uuid(), strikers: [], specials: [] }],
    compareFormationRows,
  );

  const [rowGap, setRowGap, setRowGapUnchecked] = useSaveableState(
    preferences.formationDisplay.defaultRowGap ?? 8,
  );

  const [activeRowIndex, setActiveRowIndex] = useState(0);

  const [scale, setScale, setScaleUnchecked] = useSaveableState(
    preferences.formationDisplay.defaultScale,
  );
  const [displayOverline, setDisplayOverline, setDisplayOverlineUnchecked] =
    useSaveableState(preferences.formationDisplay.defaultDisplayOverline);
  const [displayRoleIcon, setDisplayRoleIcon, setDisplayRoleIconUnchecked] =
    useSaveableState(!preferences.formationDisplay.defaultNoDisplayRole);
  const [groupsVertical, setGroupsVertical, setGroupsVerticalUnchecked] =
    useSaveableState(preferences.formationDisplay.defaultGroupsVertical);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [generationInProgress, setGenerationInProgress] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const formationId = searchParams.get("id");

  const query = useQueryWithStatus(
    api.formation.getById,
    formationId && formationId.length > 0
      ? {
          id: formationId as Id<"formation">,
        }
      : "skip",
  );

  const createMutation = useMutation(api.formation.create);
  const updateMutation = useMutation(api.formation.update);

  function addStudent(student: Student) {
    const item: StudentItem = {
      id: uuid(),
      student,
    };

    setRows((prev) => {
      const row = prev[activeRowIndex];
      if (!row) {
        return prev;
      }

      if (student.combatClass === "Main") {
        if (row.strikers.find((i) => i.student?.id === student.id)) {
          return prev;
        }

        return prev.map((r, i) =>
          i === activeRowIndex
            ? { ...r, strikers: [...r.strikers, item] }
            : r,
        );
      }

      if (student.combatClass === "Support") {
        if (row.specials.find((i) => i.student?.id === student.id)) {
          return prev;
        }

        return prev.map((r, i) =>
          i === activeRowIndex
            ? { ...r, specials: [...r.specials, item] }
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
        })),
      );
    },
    [setRows],
  );

  const updateItem = useCallback(
    (itemId: string, newData: Partial<Omit<StudentItem, "student" | "id">>) => {
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          strikers: row.strikers.map((item) =>
            item.id === itemId ? { ...item, ...newData } : item,
          ),
          specials: row.specials.map((item) =>
            item.id === itemId ? { ...item, ...newData } : item,
          ),
        })),
      );
    },
    [setRows],
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
          return { ...row, strikers: [...row.strikers, item] };
        }

        return { ...row, specials: [...row.specials, item] };
      }),
    );
  }

  function addFormationRow() {
    const newIndex = rows.length;
    setRows((prev) => [...prev, { id: uuid(), strikers: [], specials: [] }]);
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

  async function getFormationImage() {
    if (!containerRef.current || generationInProgress) {
      return;
    }

    setGenerationInProgress(true);

    await sleep(50); // HACK! Wait for the state to update before taking the screenshot.

    const canvas = await html2canvas(containerRef.current, {
      backgroundColor: null,
      scale,
    });

    const src = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = src;
    a.download = "formation.png";
    a.click();

    setGenerationInProgress(false);
  }

  async function createOrUpdateCloudFormation() {
    const hasAnyStudent = rows.some(
      (row) => row.strikers.length > 0 || row.specials.length > 0,
    );

    if (!hasAnyStudent) {
      toast.error(t("tools.formationDisplay.toasts.noStudents"));
      return;
    }

    if (requestInProgress) {
      return;
    }

    setRequestInProgress(true);

    const rowsPayload = rows.map((row) => ({
      strikers: studentItemsToPersistedSlots(row.strikers),
      specials: studentItemsToPersistedSlots(row.specials),
    }));

    const firstRow = rowsPayload[0] ?? { strikers: [], specials: [] };

    const data = {
      name: name.length > 0 ? name : undefined,
      strikers: firstRow.strikers,
      specials: firstRow.specials,
      rows: rowsPayload,
      rowGap,
      displayOverline,
      noDisplayRole: !displayRoleIcon,
      groupsVertical,
    };

    if (formationId) {
      await updateMutation({
        id: formationId as Id<"formation">,
        ...data,
      });

      markAsSaved();

      if (navigationGuard.active) {
        navigationGuard.accept();
      }

      await clearCache(`/formation-display?id=${formationId}`);

      toast.success(t("tools.formationDisplay.toasts.updateSuccess"));
    } else {
      const newFormation = await createMutation(data);

      if (newFormation) {
        markAsSaved();

        toast.success(t("tools.formationDisplay.toasts.createSuccess"));

        if (!navigationGuard.active) {
          router.push(`/formation-display?id=${newFormation._id}`);
        } else {
          navigationGuard.accept();
        }
      } else {
        toast.error(t("tools.formationDisplay.toasts.createFail"));
      }
    }

    setRequestInProgress(false);
  }

  function handleEchelonDataParsed(data: EchelonData) {
    const newStrikers: StudentItem[] = [];
    const newSpecials: StudentItem[] = [];

    const studentIds = new Set<string>();

    for (const item of data.strikers) {
      if (!item) {
        newStrikers.push({
          id: uuid(),
        });
      } else {
        if (!studentIds.has(item.student.id)) {
          studentIds.add(item.student.id);

          newStrikers.push({
            id: uuid(),
            student: item.student,
            level: item.level,
            starLevel: item.starLevel,
            ueLevel: item.ueLevel,
            starter: item.starter,
            borrowed: item.borrowed,
          });
        }
      }
    }

    for (const item of data.specials) {
      if (!item) {
        newSpecials.push({
          id: uuid(),
        });
      } else {
        if (!studentIds.has(item.student.id)) {
          studentIds.add(item.student.id);

          newSpecials.push({
            id: uuid(),
            student: item.student,
            level: item.level,
            starLevel: item.starLevel,
            ueLevel: item.ueLevel,
            starter: item.starter,
            borrowed: item.borrowed,
          });
        }
      }
    }

    setRows((prev) =>
      prev.map((row, i) =>
        i === activeRowIndex
          ? { ...row, strikers: newStrikers, specials: newSpecials }
          : row,
      ),
    );
  }

  useEffect(() => {
    if (!formationId) {
      // reset
      setNameUnchecked("");
      setRowsUnchecked([{ id: uuid(), strikers: [], specials: [] }]);
      setRowGapUnchecked(preferences.formationDisplay.defaultRowGap ?? 8);
      setActiveRowIndex(0);
      setScaleUnchecked(1);
      setDisplayOverlineUnchecked(false);
      setDisplayRoleIconUnchecked(true);
      setGroupsVerticalUnchecked(false);
      return;
    }

    if (query.status === "success") {
      const sourceRows =
        query.data.rows && query.data.rows.length > 0
          ? query.data.rows
          : [
              {
                strikers: query.data.strikers,
                specials: query.data.specials,
              },
            ];

      const loadedRows: FormationEditorRow[] = sourceRows.map((row) => ({
        id: uuid(),
        strikers: persistedSlotsToStudentItems(row.strikers, allStudents),
        specials: persistedSlotsToStudentItems(row.specials, allStudents),
      }));

      setNameUnchecked(query.data.name || "");
      setRowsUnchecked(loadedRows);
      setRowGapUnchecked(query.data.rowGap ?? 8);
      setActiveRowIndex(0);
      setScaleUnchecked(1);
      setDisplayOverlineUnchecked(query.data.displayOverline || false);
      setDisplayRoleIconUnchecked(!query.data.noDisplayRole);
      setGroupsVerticalUnchecked(query.data.groupsVertical || false);
    }

    if (query.status === "error") {
      toast.error("Echelon load fail");
      router.push("/formation-display");
    }
  }, [formationId, query.status]);

  useEffect(() => {
    const rosterEmpty = rows.every(
      (row) => row.strikers.length === 0 && row.specials.length === 0,
    );

    if (!rosterEmpty) {
      return;
    }

    setScaleUnchecked(preferences.formationDisplay.defaultScale);
    setDisplayOverlineUnchecked(
      preferences.formationDisplay.defaultDisplayOverline,
    );
    setDisplayRoleIconUnchecked(
      !preferences.formationDisplay.defaultNoDisplayRole,
    );
    setGroupsVerticalUnchecked(
      preferences.formationDisplay.defaultGroupsVertical,
    );
    setRowGapUnchecked(preferences.formationDisplay.defaultRowGap ?? 8);
  }, [preferences, rows]);

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
            typeof action === "function"
              ? action(row.strikers)
              : action;

          return prev.map((r, i) =>
            i === rowIndex ? { ...r, strikers: nextStrikers } : r,
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
            typeof action === "function"
              ? action(row.specials)
              : action;

          return prev.map((r, i) =>
            i === rowIndex ? { ...r, specials: nextSpecials } : r,
          );
        });
      },
      onWantsToRemove: removeItem,
      onWantsToUpdate: updateItem,
    }));
  }, [rows, selectedItemId, removeItem, updateItem, setRows]);

  const totalSlotCount = useMemo(
    () =>
      rows.reduce(
        (acc, row) => acc + row.strikers.length + row.specials.length,
        0,
      ),
    [rows],
  );

  const hasAnyCard = totalSlotCount > 0;

  if (formationId && query.status === "pending") {
    return (
      <MessageBox>{t("tools.formationDisplay.loadingFormation")}</MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div
        className={cn(" -mt-6 flex flex-col gap-4", {
          hidden: hasAnyCard,
        })}
      >
        <p>{t("tools.formationDisplay.descriptionLong")}</p>
        <p className="md:hidden text-muted-foreground">
          {t.rich("tools.formationDisplay.mobileNotice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </p>
        <p className="text-muted-foreground">
          {t.rich("tools.formationDisplay.renderNotice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </p>
      </div>

      {hasAnyCard && (
        <p className="text-center text-sm text-muted-foreground">
          {t("tools.timeline.clickToEditPreview")}
        </p>
      )}

      {!hasAnyCard ? (
        <div className="border rounded-md px-4 py-10 text-center text-xl text-muted-foreground">
          {t("tools.formationDisplay.noStudentsInFormation")}
        </div>
      ) : (
        <div className="flex w-full justify-center">
          <div
            ref={containerRef}
            className="inline-flex w-fit max-w-full flex-col items-center"
            style={{ gap: rowGap ?? 8 }}
          >
            {rows.map((row, rowIndex) => (
              <FormationPreview
                key={row.id}
                strikers={row.strikers}
                specials={row.specials}
                displayOverline={displayOverline}
                noDisplayRole={!displayRoleIcon}
                groupsVertical={groupsVertical}
                editableConfig={editableConfigByRow[rowIndex]}
              />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent>
          <Tabs defaultValue="items" className="gap-4">
            <TabsList className="place-self-center">
              <TabsTrigger value="items">
                {t("tools.formationDisplay.tabs.items")}
              </TabsTrigger>
              <TabsTrigger value="appearance">
                {t("tools.formationDisplay.tabs.appearance")}
              </TabsTrigger>
              <Authenticated>
                <TabsTrigger value="cloud">
                  {t("tools.formationDisplay.tabs.cloud")}
                </TabsTrigger>
              </Authenticated>
            </TabsList>

            <TabsContent value="items">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4 items-center justify-center">
                  <div className="flex flex-wrap gap-2 items-center justify-center">
                    <Label className="shrink-0">
                      {t("tools.formationDisplay.activeRow")}
                    </Label>
                    <Select
                      value={activeRowIndex.toString()}
                      onValueChange={(val) =>
                        setActiveRowIndex(Number.parseInt(val, 10))
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rows.map((row, i) => (
                          <SelectItem key={row.id} value={i.toString()}>
                            {t("tools.formationDisplay.rowNumber", {
                              number: i + 1,
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFormationRow}
                    >
                      <PlusIcon className="size-4" />
                      {t("tools.formationDisplay.addRow")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeFormationRow}
                      disabled={rows.length <= 1}
                    >
                      {t("tools.formationDisplay.removeRow")}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4 items-center justify-center">
                  <StudentPicker
                    onStudentSelected={addStudent}
                    className="w-[200px] md:w-[250px]"
                  >
                    <Button
                      variant="outline"
                      className="w-[200px] md:w-[250px] justify-between"
                    >
                      {t("tools.formationDisplay.selectStudent")}
                      <ChevronsUpDownIcon />
                    </Button>
                  </StudentPicker>

                  <Button
                    variant="outline"
                    onClick={() => addEmptyCard("striker")}
                  >
                    <PlusIcon />
                    {t("tools.formationDisplay.emptyStriker")}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => addEmptyCard("special")}
                  >
                    <PlusIcon />
                    {t("tools.formationDisplay.emptySpecial")}
                  </Button>

                  <ParseEchelonDataDialog onParse={handleEchelonDataParsed}>
                    <Button variant="outline">
                      <ImportIcon />
                      {t("tools.formationDisplay.bulkImport")}
                    </Button>
                  </ParseEchelonDataDialog>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance">
              <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-center flex-wrap">
                <div className="flex gap-2 items-center">
                  <Label className="shrink-0" htmlFor="formation-row-gap">
                    {t("tools.formationDisplay.rowSpacing")}
                  </Label>
                  <Input
                    id="formation-row-gap"
                    type="number"
                    className="w-20"
                    min={0}
                    max={200}
                    value={(rowGap ?? 8).toString()}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(n)) {
                        setRowGap(Math.min(200, Math.max(0, n)));
                      }
                    }}
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <Label className="shrink-0">{t("common.scale")}</Label>

                  <Select
                    value={scale.toString()}
                    onValueChange={(val) => setScale(Number.parseInt(val, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="3">3x</SelectItem>
                      <SelectItem value="4">4x</SelectItem>
                      <SelectItem value="5">5x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 items-center">
                  <Switch
                    id="display-overline"
                    checked={displayOverline}
                    onCheckedChange={setDisplayOverline}
                  />
                  <Label htmlFor="display-overline">
                    {t("tools.formationDisplay.displayOverline")}
                  </Label>
                </div>

                <div className="flex gap-2 items-center">
                  <Switch
                    id="display-role-icon"
                    checked={displayRoleIcon}
                    onCheckedChange={setDisplayRoleIcon}
                  />
                  <Label htmlFor="display-role-icon">
                    {t("tools.formationDisplay.displayRoleIcon")}
                  </Label>
                </div>

                <div className="flex gap-2 items-center">
                  <Switch
                    id="groups-vertical"
                    checked={groupsVertical}
                    onCheckedChange={setGroupsVertical}
                  />
                  <Label htmlFor="groups-vertical">
                    {t("tools.formationDisplay.verticalGroups")}
                  </Label>
                </div>
              </div>
            </TabsContent>

            <Authenticated>
              <TabsContent value="cloud">
                <div className="flex gap-6 items-center justify-center">
                  <div className="flex gap-2 items-center shrink-0 w-full max-w-md">
                    <Label className="shrink-0">
                      {t("tools.formationDisplay.formationName")}
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("common.untitledFormation")}
                    />
                  </div>

                  <Button
                    onClick={createOrUpdateCloudFormation}
                    disabled={generationInProgress}
                  >
                    {formationId
                      ? t("tools.formationDisplay.updateFormation")
                      : t("tools.formationDisplay.saveFormation")}
                  </Button>
                </div>
              </TabsContent>
            </Authenticated>
          </Tabs>

          <Authenticated>
            <div className="mt-4 flex items-center justify-center">
              <SaveStatus
                isDirty={hasUnsavedChanges}
                isSaving={requestInProgress}
              />
            </div>
          </Authenticated>
        </CardContent>
      </Card>

      <div className="flex gap-4 items-center justify-center">
        <Button
          onClick={getFormationImage}
          disabled={!hasAnyCard || generationInProgress}
        >
          {t("common.downloadImage")}
        </Button>
      </div>

      <Authenticated>
        <SaveDialog
          open={navigationGuard.active}
          title={t("tools.formationDisplay.saveDialog.title")}
          description={t("tools.formationDisplay.saveDialog.description")}
          onYes={createOrUpdateCloudFormation}
          onNo={navigationGuard.accept}
          onCancel={navigationGuard.reject}
        />
      </Authenticated>
    </div>
  );
}
