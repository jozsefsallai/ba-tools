"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useStudents } from "@/hooks/use-students";
import { orderStudentsByFuzzyNameQuery } from "@/lib/student-search-query";
import { useMutation } from "convex/react";
import { FileJsonIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type DragEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import type { Student } from "~prisma";

const IMPORT_BATCH_SIZE = 100;

type ImportedMatch = {
  attackTeam: Array<{ studentId?: string }>;
  defenseTeam: Array<{ studentId?: string }>;
  attackWins: boolean;
  videoUrl?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveStudent(
  students: Student[],
  query: string,
  combatClass: Student["combatClass"],
) {
  return query
    ? orderStudentsByFuzzyNameQuery(
        students.filter((student) => student.combatClass === combatClass),
        query,
      ).ordered[0]
    : undefined;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

export type PVPBulkImportDialogProps = {
  seasonId: Id<"pvpSeason">;
};

export function PVPBulkImportDialog({ seasonId }: PVPBulkImportDialogProps) {
  const t = useTranslations();
  const { students } = useStudents();
  const importMatches = useMutation(api.pvp.bulkImportMatches);
  const clearSeasonMatches = useMutation(api.pvp.clearSeasonMatches);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string>();
  const [matches, setMatches] = useState<ImportedMatch[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [unresolvedStudents, setUnresolvedStudents] = useState<string[]>([]);
  const [ignoredDuplicateRows, setIgnoredDuplicateRows] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);

  function reset() {
    setFileName(undefined);
    setMatches([]);
    setValidationErrors([]);
    setUnresolvedStudents([]);
    setIgnoredDuplicateRows(0);
    setProcessed(0);
    setIsValidating(false);
    setIsImporting(false);
    setIsClearing(false);
    setReplaceExisting(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setFileName(file.name);
    setMatches([]);
    setValidationErrors([]);
    setUnresolvedStudents([]);
    setIgnoredDuplicateRows(0);
    setProcessed(0);
    setIsValidating(true);

    if (students.length === 0) {
      setValidationErrors([t("tools.pvp.bulkImport.studentsUnavailable")]);
      setIsValidating(false);
      return;
    }

    const errors: string[] = [];
    const unresolved = new Map<string, Set<number>>();
    const resolved: ImportedMatch[] = [];
    const duplicateRows = new Set<number>();
    const resolutionCache = new Map<string, Student | undefined>();

    const resolveImportedStudent = (
      value: string,
      combatClass: Student["combatClass"],
    ) => {
      const query = value.trim().split(".").join("");
      const cacheKey = `${combatClass}:${query}`;

      if (!resolutionCache.has(cacheKey)) {
        resolutionCache.set(
          cacheKey,
          resolveStudent(students, query, combatClass),
        );
      }

      return resolutionCache.get(cacheKey);
    };

    try {
      const parsed: unknown = JSON.parse(await file.text());

      if (!Array.isArray(parsed)) {
        errors.push(t("tools.pvp.bulkImport.rootMustBeArray"));
      } else {
        for (const [index, value] of parsed.entries()) {
          if (index > 0 && index % 10 === 0) {
            await yieldToBrowser();
          }

          const row = index + 1;
          if (!isRecord(value)) {
            errors.push(t("tools.pvp.bulkImport.invalidRow", { row }));
            continue;
          }

          const attack = value.attack;
          const defense = value.defense;
          const attackWins = value.attackWins;
          const videoUrl = value.videoUrl;

          if (
            !Array.isArray(attack) ||
            attack.length !== 6 ||
            !Array.isArray(defense) ||
            defense.length !== 6
          ) {
            errors.push(t("tools.pvp.bulkImport.invalidFormation", { row }));
            continue;
          }

          if (typeof attackWins !== "boolean") {
            errors.push(t("tools.pvp.bulkImport.invalidResult", { row }));
            continue;
          }

          if (videoUrl !== undefined && typeof videoUrl !== "string") {
            errors.push(t("tools.pvp.bulkImport.invalidVideoUrl", { row }));
            continue;
          }

          const resolveTeam = (values: unknown[], label: string) => {
            const team: Array<{ studentId?: string }> = [];
            let hasStriker = false;
            const ids = new Set<string>();
            let valid = true;

            for (const [slot, item] of values.entries()) {
              if (item === null) {
                team.push({});
                continue;
              }

              if (typeof item !== "string" || !item.trim()) {
                errors.push(
                  t("tools.pvp.bulkImport.invalidStudentValue", {
                    row,
                    slot: slot + 1,
                  }),
                );
                valid = false;
                team.push({});
                continue;
              }

              const student = resolveImportedStudent(
                item,
                slot < 4 ? "Main" : "Support",
              );

              if (!student) {
                const key = item.trim();
                const rows = unresolved.get(key) ?? new Set<number>();
                rows.add(row);
                unresolved.set(key, rows);
                valid = false;
                team.push({});
                continue;
              }

              if (slot < 4) {
                hasStriker = true;
              }

              if (ids.has(student.id)) {
                duplicateRows.add(row);
                valid = false;
              }

              ids.add(student.id);
              team.push({ studentId: student.id });
            }

            if (!hasStriker) {
              errors.push(
                t("tools.pvp.bulkImport.missingStriker", { row, label }),
              );
              valid = false;
            }

            return { team, valid };
          };

          const attackTeam = resolveTeam(attack, "attack");
          const defenseTeam = resolveTeam(defense, "defense");

          if (attackTeam.valid && defenseTeam.valid) {
            resolved.push({
              attackTeam: attackTeam.team,
              defenseTeam: defenseTeam.team,
              attackWins,
              videoUrl: videoUrl || undefined,
            });
          }
        }
      }
    } catch {
      errors.push(t("tools.pvp.bulkImport.invalidJson"));
    }

    setValidationErrors(errors);
    setUnresolvedStudents(
      [...unresolved.entries()].map(([value, rows]) =>
        t("tools.pvp.bulkImport.unresolvedStudent", {
          value,
          rows: [...rows].join(", "),
        }),
      ),
    );
    setIgnoredDuplicateRows(duplicateRows.size);
    setMatches(errors.length === 0 && unresolved.size === 0 ? resolved : []);
    setIsValidating(false);
  }

  function chooseFile() {
    if (!isValidating && !isImporting) {
      inputRef.current?.click();
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (!isValidating && !isImporting) {
      void handleFile(event.dataTransfer.files[0]);
    }
  }

  async function handleImport() {
    if (matches.length === 0 || isImporting) {
      return;
    }

    if (
      replaceExisting &&
      !window.confirm(t("tools.pvp.bulkImport.confirmReplaceExisting"))
    ) {
      return;
    }

    setIsImporting(true);
    setProcessed(0);

    try {
      if (replaceExisting) {
        setIsClearing(true);

        let cursor: string | undefined;

        do {
          const page = await clearSeasonMatches({ seasonId, cursor });
          cursor = page.isDone ? undefined : page.continueCursor;
        } while (cursor);

        setIsClearing(false);
      }

      for (let index = 0; index < matches.length; index += IMPORT_BATCH_SIZE) {
        const batch = matches.slice(index, index + IMPORT_BATCH_SIZE);
        await importMatches({ seasonId, matches: batch });
        setProcessed(Math.min(index + batch.length, matches.length));
      }

      toast.success(
        t("tools.pvp.bulkImport.completed", { count: matches.length }),
      );

      setOpen(false);
      reset();
    } catch (error) {
      console.error(error);
      toast.error(t("tools.pvp.bulkImport.failed"));
    } finally {
      setIsClearing(false);
      setIsImporting(false);
    }
  }

  const progress = matches.length > 0 ? (processed / matches.length) * 100 : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isImporting) {
          setOpen(nextOpen);
          if (!nextOpen) {
            reset();
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadIcon />
          {t("tools.pvp.bulkImport.open")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("tools.pvp.bulkImport.title")}</DialogTitle>
          <DialogDescription>
            {t("tools.pvp.bulkImport.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={isValidating || isImporting}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />

          <button
            type="button"
            disabled={isValidating || isImporting}
            className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-dashed bg-muted/30 p-4 text-left transition-colors hover:border-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            onClick={chooseFile}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileJsonIcon className="size-6" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {fileName ?? t("tools.pvp.bulkImport.chooseFile")}
              </p>
              <p className="text-xs text-muted-foreground">
                {fileName
                  ? t("tools.pvp.bulkImport.replaceFile")
                  : t("tools.pvp.bulkImport.dropFile")}
              </p>
            </div>

            <UploadIcon className="size-5 shrink-0 text-muted-foreground" />
          </button>

          {isValidating && <p>{t("tools.pvp.bulkImport.validating")}</p>}

          {validationErrors.length > 0 && (
            <div className="rounded-md border border-amber-400/60 bg-amber-400/10 p-3 text-sm text-foreground">
              <p className="font-semibold text-amber-200">
                {t("tools.pvp.bulkImport.validationFailed")}
              </p>

              <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-foreground/90">
                {validationErrors.map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {unresolvedStudents.length > 0 && (
            <div className="rounded-md border border-amber-400/60 bg-amber-400/10 p-3 text-sm text-foreground">
              <p className="font-semibold text-amber-200">
                {t("tools.pvp.bulkImport.unresolvedTitle")}
              </p>

              <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-foreground/90">
                {unresolvedStudents.map((student) => (
                  <li key={student}>{student}</li>
                ))}
              </ul>
            </div>
          )}

          {ignoredDuplicateRows > 0 && (
            <p className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200">
              {t("tools.pvp.bulkImport.duplicatesIgnored", {
                count: ignoredDuplicateRows,
              })}
            </p>
          )}

          {matches.length > 0 && !isImporting && (
            <p className="text-sm text-muted-foreground">
              {t("tools.pvp.bulkImport.ready", { count: matches.length })}
            </p>
          )}

          {matches.length > 0 && !isImporting && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
              <Checkbox
                id="pvp-replace-existing"
                className="mt-0.5"
                checked={replaceExisting}
                onCheckedChange={(checked) =>
                  setReplaceExisting(checked === true)
                }
              />

              <Label
                htmlFor="pvp-replace-existing"
                className="min-w-0 flex-1 cursor-pointer flex-col items-start gap-1 text-left text-sm font-normal leading-normal"
              >
                <span className="font-semibold leading-5">
                  {t("tools.pvp.bulkImport.replaceExisting")}
                </span>

                <span className="text-xs leading-5 text-muted-foreground">
                  {t("tools.pvp.bulkImport.replaceExistingDescription")}
                </span>
              </Label>
            </div>
          )}

          {isImporting && (
            <div className="flex flex-col gap-2">
              <Progress value={isClearing ? undefined : progress} />

              {isClearing ? (
                <p className="text-sm text-muted-foreground">
                  {t("tools.pvp.bulkImport.clearingExisting")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("tools.pvp.bulkImport.progress", {
                    processed,
                    total: matches.length,
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => void handleImport()}
            disabled={matches.length === 0 || isValidating || isImporting}
          >
            <UploadIcon />

            {isImporting
              ? t("tools.pvp.bulkImport.importing")
              : t("tools.pvp.bulkImport.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
