"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import html2canvas from "html2canvas-pro";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PlusIcon,
  SaveIcon,
  Undo2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import slugify from "slugify";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { FormationPreview } from "@/app/[locale]/formation-display/_components/formation-preview";
import { FormationRowsStack } from "@/app/[locale]/formation-display/_components/formation-row-label";
import { StarterOrderPanel } from "@/app/[locale]/formation-display/_components/starter-order-panel";
import { useFormationRowsEditor } from "@/app/[locale]/formation-display/_hooks/use-formation-rows-editor";
import { TimelineFormationPicker } from "@/app/[locale]/timeline-visualizer/_components/timeline-formation-picker";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserPreferences } from "@/hooks/use-preferences";
import { useStudents } from "@/hooks/use-students";
import { Link } from "@/i18n/navigation";
import { revalidateFormation } from "@/lib/cache";
import { useQueryWithStatus } from "@/lib/convex";
import { DndZoomContext } from "@/lib/dnd-mobile";
import type { FormationEditorRow } from "@/lib/formation-display-utils";
import { type FormationType, inferFormationType } from "@/lib/formation-type";
import { prepareCdnImagesForScreenshot } from "@/lib/screenshot";
import { sleep } from "@/lib/sleep";
import {
  formationDiffersFromSource,
  formationSourceToState,
  formationStateToData,
  hasFormationSlots,
  type TimelineFormationState,
} from "@/lib/timeline-formation";
import { cn } from "@/lib/utils";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const NO_ROWS: FormationEditorRow[] = [];

const DOWNLOAD_SCALES = [
  1,
  2,
  3,
  4,
  5,
];

export type TimelineFormationSectionProps = {
  formation: TimelineFormationState | null;
  setFormation: Dispatch<SetStateAction<TimelineFormationState | null>>;
};

export function TimelineFormationSection({
  formation,
  setFormation,
}: TimelineFormationSectionProps) {
  const t = useTranslations();
  const { students: allStudents } = useStudents();
  const { preferences } = useUserPreferences();
  const { isSignedIn } = useUser();
  const { isAuthenticated } = useConvexAuth();

  const [collapsed, setCollapsed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const previewZoomRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [downloadScale, setDownloadScale] = useState<number | null>(null);
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const effectiveDownloadScale =
    downloadScale ?? preferences.formationDisplay.defaultScale;

  const createMutation = useMutation(api.formation.create);
  const updateMutation = useMutation(api.formation.update);

  const formationId = formation?.id;

  const sourceQuery = useQueryWithStatus(
    api.formation.getById,
    formationId && isAuthenticated
      ? {
          id: formationId as Id<"formation">,
        }
      : "skip",
  );

  const source = sourceQuery.status === "success" ? sourceQuery.data : null;
  const isLinked = !!formationId && sourceQuery.status !== "error";
  const sourceMissing = !!formationId && sourceQuery.status === "error";

  const differsFromSource = useMemo(
    () =>
      !!formation &&
      !!source &&
      formationDiffersFromSource(formation, source, allStudents),
    [
      formation,
      source,
      allStudents,
    ],
  );

  const setRows = useCallback<Dispatch<SetStateAction<FormationEditorRow[]>>>(
    (action) => {
      setFormation((prev) =>
        prev
          ? {
              ...prev,
              rows: typeof action === "function" ? action(prev.rows) : action,
            }
          : prev,
      );
    },
    [
      setFormation,
    ],
  );

  const rows = formation?.rows ?? NO_ROWS;

  const {
    activeRowIndex,
    setActiveRowIndex,
    addStudent,
    updateItem,
    addEmptyCard,
    addFormationRow,
    removeFormationRow,
    editableConfigByRow,
  } = useFormationRowsEditor({
    rows,
    setRows,
    formationType: formation?.type,
    formationId,
  });

  const effectiveType = useMemo(
    () => formation?.type ?? inferFormationType(rows),
    [
      formation?.type,
      rows,
    ],
  );

  const hasSlots = hasFormationSlots(formation);

  function runGuarded(action: () => void) {
    const wouldLoseWork = isLinked ? differsFromSource : hasSlots;

    if (wouldLoseWork) {
      setPendingAction(() => action);
      return;
    }

    action();
  }

  function startFromScratch() {
    setActiveRowIndex(0);
    setFormation({
      name: "",
      rows: [
        {
          id: uuid(),
          strikers: [],
          specials: [],
          tcs: [],
        },
      ],
      rowGap: preferences.formationDisplay.defaultRowGap ?? 8,
      displayOverline: preferences.formationDisplay.defaultDisplayOverline,
      noDisplayRole: preferences.formationDisplay.defaultNoDisplayRole,
      groupsVertical: preferences.formationDisplay.defaultGroupsVertical,
    });
  }

  function clearFormation() {
    setActiveRowIndex(0);
    setFormation(null);
  }

  function selectSavedFormation(
    saved: Parameters<typeof formationSourceToState>[0] & {
      _id: Id<"formation">;
    },
  ) {
    runGuarded(() => {
      setActiveRowIndex(0);
      setFormation(formationSourceToState(saved, allStudents, saved._id));
    });
  }

  function revertToSaved() {
    if (!source) {
      return;
    }

    setActiveRowIndex(0);
    setFormation(formationSourceToState(source, allStudents, source._id));
  }

  async function saveFormation() {
    if (!formation || saving) {
      return;
    }

    setSaving(true);

    const data = formationStateToData(formation);
    const firstRow = data.rows[0] ?? {
      strikers: [],
      specials: [],
    };
    const payload = {
      ...data,
      strikers: firstRow.strikers,
      specials: firstRow.specials,
    };

    try {
      if (isLinked && formationId) {
        await updateMutation({
          id: formationId as Id<"formation">,
          ...payload,
        });
        await revalidateFormation(formationId);
        toast.success(t("tools.formationDisplay.toasts.updateSuccess"));
      } else {
        const created = await createMutation(payload);

        if (created) {
          setFormation((prev) =>
            prev
              ? {
                  ...prev,
                  id: created._id,
                }
              : prev,
          );
          toast.success(t("tools.formationDisplay.toasts.createSuccess"));
        } else {
          toast.error(t("tools.formationDisplay.toasts.createFail"));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(t("tools.timeline.formation.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function downloadFormationImage() {
    if (!formation || !previewRef.current || generationInProgress) {
      return;
    }

    setGenerationInProgress(true);
    editableConfigByRow[0]?.onItemSelected(null);

    try {
      await sleep(50); // Wait for the zoom to be removed before the screenshot.

      if (!previewRef.current) {
        return;
      }

      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: null,
        scale: effectiveDownloadScale,
        useCORS: true,
        onclone: prepareCdnImagesForScreenshot,
      });

      const trimmedName = formation.name.trim();
      const filename =
        trimmedName.length > 0
          ? slugify(trimmedName, {
              lower: true,
            })
          : "formation";

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${filename}.png`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerationInProgress(false);
    }
  }

  const summaryName = formation
    ? formation.name || t("common.untitledFormation")
    : null;

  return (
    <Card className="gap-0 py-0">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 px-6 py-4 text-left max-md:px-4"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <UsersIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-semibold">
          {t("tools.timeline.formation.title")}
        </span>
        {collapsed && summaryName && (
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {summaryName}
          </span>
        )}
        <ChevronDownIcon
          className={cn(
            "ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
            collapsed && "-rotate-90",
          )}
        />
      </button>

      {!collapsed && (
        <CardContent className="flex flex-col gap-4 border-t px-6 py-4 max-md:px-4">
          {!formation ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="max-w-prose text-sm text-muted-foreground">
                {t("tools.timeline.formation.emptyDescription")}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {isSignedIn && (
                  <TimelineFormationPicker
                    label={t("tools.timeline.formation.choose")}
                    onSelect={selectSavedFormation}
                    className="justify-between gap-2"
                  />
                )}

                <Button variant="outline" onClick={startFromScratch}>
                  <PlusIcon />
                  {t("tools.timeline.formation.buildFromScratch")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="w-64 max-md:w-full"
                  value={formation.name}
                  maxLength={100}
                  placeholder={t("tools.timeline.formation.namePlaceholder")}
                  aria-label={t("tools.timeline.formation.namePlaceholder")}
                  onChange={(event) => {
                    const name = event.target.value;
                    setFormation((prev) =>
                      prev
                        ? {
                            ...prev,
                            name,
                          }
                        : prev,
                    );
                  }}
                />

                {isLinked && source && !differsFromSource && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CheckIcon className="size-4" />
                    {t("tools.timeline.formation.status.saved")}
                  </span>
                )}

                {differsFromSource && (
                  <span className="text-sm text-muted-foreground">
                    {t("tools.timeline.formation.status.differs")}
                  </span>
                )}

                {sourceMissing && (
                  <span className="text-sm text-muted-foreground">
                    {t("tools.timeline.formation.status.deleted")}
                  </span>
                )}

                <div className="ml-auto flex flex-wrap items-center gap-2 max-md:ml-0">
                  {differsFromSource && (
                    <>
                      <Button
                        size="sm"
                        onClick={saveFormation}
                        disabled={saving}
                      >
                        <SaveIcon />
                        {t("tools.timeline.formation.update")}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={revertToSaved}
                      >
                        <Undo2Icon />
                        {t("tools.timeline.formation.useSaved")}
                      </Button>
                    </>
                  )}

                  {!isLinked && isSignedIn && (
                    <Button
                      size="sm"
                      onClick={saveFormation}
                      disabled={saving || !hasSlots}
                    >
                      <SaveIcon />
                      {t("tools.timeline.formation.saveNew")}
                    </Button>
                  )}

                  {isLinked && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link
                        href={`/formation-display?id=${formationId}`}
                        target="_blank"
                      >
                        <ExternalLinkIcon />
                        {t("tools.timeline.formation.openInEditor")}
                      </Link>
                    </Button>
                  )}

                  {isSignedIn && (
                    <TimelineFormationPicker
                      label={t("tools.timeline.formation.change")}
                      onSelect={selectSavedFormation}
                      className="h-8 gap-1.5 px-3 text-sm"
                    />
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => runGuarded(clearFormation)}
                  >
                    <XIcon />
                    {t("tools.timeline.formation.clear")}
                  </Button>
                </div>
              </div>

              {!isSignedIn && (
                <p className="text-sm text-muted-foreground">
                  {t("tools.timeline.formation.signInToSave")}
                </p>
              )}

              {hasSlots ? (
                <div className="flex w-full justify-center max-md:justify-center-safe max-md:overflow-x-auto @5xl:justify-center-safe @5xl:overflow-x-auto">
                  <div
                    ref={previewZoomRef}
                    className={cn(
                      "max-md:shrink-0 @5xl:shrink-0",
                      !generationInProgress &&
                        "md:[zoom:0.8] max-md:[zoom:0.75]",
                    )}
                  >
                    <DndZoomContext value={previewZoomRef}>
                      <FormationRowsStack
                        ref={previewRef}
                        className="max-md:w-max max-md:max-w-none max-md:shrink-0 @5xl:w-max @5xl:max-w-none @5xl:shrink-0"
                        rowGap={formation.rowGap ?? 8}
                        items={rows.map((row, rowIndex) => ({
                          key: row.id,
                          label: row.label,
                          children: (
                            <FormationPreview
                              strikers={row.strikers}
                              specials={row.specials}
                              tcs={row.tcs}
                              displayOverline={formation.displayOverline}
                              noDisplayRole={formation.noDisplayRole}
                              groupsVertical={formation.groupsVertical}
                              formationType={effectiveType}
                              editableConfig={editableConfigByRow[rowIndex]}
                            />
                          ),
                        }))}
                      />
                    </DndZoomContext>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("tools.timeline.formation.noStudents")}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                <StudentPicker
                  onStudentSelected={addStudent}
                  className="w-[200px] md:w-[250px]"
                >
                  <Button
                    variant="outline"
                    className="w-[200px] justify-between md:w-[250px]"
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

                <div className="flex items-center">
                  <Button
                    className="rounded-r-none"
                    disabled={!hasSlots || generationInProgress}
                    onClick={downloadFormationImage}
                  >
                    <DownloadIcon />
                    {t("common.downloadImage")} ({effectiveDownloadScale}x)
                  </Button>

                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        className="rounded-l-none border-l border-primary-foreground/20"
                        disabled={!hasSlots || generationInProgress}
                        aria-label={t("tools.timeline.actions.downloadOptions")}
                      >
                        <ChevronDownIcon />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("common.scale")}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={effectiveDownloadScale.toString()}
                        onValueChange={(value) =>
                          setDownloadScale(Number.parseInt(value, 10))
                        }
                      >
                        {DOWNLOAD_SCALES.map((value) => (
                          <DropdownMenuRadioItem
                            key={value}
                            value={value.toString()}
                          >
                            {value}x
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">
                    {t("tools.formationDisplay.formationType")}
                  </Label>
                  <Select
                    value={formation.type ?? "auto"}
                    onValueChange={(value) => {
                      const type =
                        value === "auto" ? undefined : (value as FormationType);
                      setFormation((prev) =>
                        prev
                          ? {
                              ...prev,
                              type,
                            }
                          : prev,
                      );
                    }}
                  >
                    <SelectTrigger className="w-[240px] max-md:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        {t("tools.formationDisplay.formationTypeAuto", {
                          detected: t(
                            `tools.formationDisplay.formationType_${effectiveType}`,
                          ),
                        })}
                      </SelectItem>
                      <SelectItem value="normal">
                        {t("tools.formationDisplay.formationType_normal")}
                      </SelectItem>
                      <SelectItem value="finalRestrictionRelease">
                        {t(
                          "tools.formationDisplay.formationType_finalRestrictionRelease",
                        )}
                      </SelectItem>
                      <SelectItem value="tacticalRelay">
                        {t(
                          "tools.formationDisplay.formationType_tacticalRelay",
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {rows.length > 1 && (
                    <>
                      <Label className="shrink-0">
                        {t("tools.formationDisplay.activeRow")}
                      </Label>
                      <Select
                        value={activeRowIndex.toString()}
                        onValueChange={(value) =>
                          setActiveRowIndex(Number.parseInt(value, 10))
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rows.map((row, index) => (
                            <SelectItem key={row.id} value={index.toString()}>
                              {t("tools.formationDisplay.rowNumber", {
                                number: index + 1,
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  <Button variant="outline" size="sm" onClick={addFormationRow}>
                    <PlusIcon />
                    {t("tools.formationDisplay.addRow")}
                  </Button>

                  {rows.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeFormationRow}
                    >
                      {t("tools.formationDisplay.removeRow")}
                    </Button>
                  )}
                </div>
              </div>

              {hasSlots && (
                <StarterOrderPanel
                  row={rows[activeRowIndex]}
                  formationType={effectiveType}
                  onUpdateItem={updateItem}
                  defaultCollapsed
                />
              )}
            </>
          )}
        </CardContent>
      )}

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("tools.timeline.formation.confirmReplace.title")}
            </DialogTitle>
            <DialogDescription>
              {t("tools.timeline.formation.confirmReplace.description")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                pendingAction?.();
                setPendingAction(null);
              }}
            >
              {t("tools.timeline.formation.confirmReplace.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
