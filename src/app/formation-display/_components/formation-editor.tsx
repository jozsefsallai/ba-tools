"use client";

import {
  FormationPreview,
  type StudentItem,
} from "@/app/formation-display/_components/formation-preview";
import type { Student } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ChevronsUpDownIcon, ImportIcon, PlusIcon } from "lucide-react";

import { sleep } from "@/lib/sleep";
import { StudentPicker } from "@/components/common/student-picker";

import { FormationItemContainer } from "@/app/formation-display/_components/formation-item-container";
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

type CombatClass = "striker" | "special";

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

  const [strikers, setStrikers, setStrikersUnchecked] = useSaveableState<
    StudentItem[]
  >(
    [],
    useCallback((a: StudentItem[], b: StudentItem[]) => {
      if (a.length !== b.length) {
        return false;
      }

      for (let i = 0; i < a.length; ++i) {
        const itemA = a[i];
        const itemB = b[i];

        if (itemA.id !== itemB.id) {
          return false;
        }

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
    }, []),
  );
  const [specials, setSpecials, setSpecialsUnchecked] = useSaveableState<
    StudentItem[]
  >([]);

  const [scale, setScale, setScaleUnchecked] = useSaveableState(
    preferences.formationDisplay.defaultScale,
  );
  const [displayOverline, setDisplayOverline, setDisplayOverlineUnchecked] =
    useSaveableState(preferences.formationDisplay.defaultDisplayOverline);
  const [displayRoleIcon, setDisplayRoleIcon, setDisplayRoleIconUnchecked] =
    useSaveableState(!preferences.formationDisplay.defaultNoDisplayRole);
  const [groupsVertical, setGroupsVertical, setGroupsVerticalUnchecked] =
    useSaveableState(preferences.formationDisplay.defaultGroupsVertical);

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

    if (student.combatClass === "Main") {
      if (strikers.find((item) => item.student?.id === student.id)) {
        return;
      }

      setStrikers((prev) => [...prev, item]);
    }

    if (student.combatClass === "Support") {
      if (specials.find((item) => item.student?.id === student.id)) {
        return;
      }

      setSpecials((prev) => [...prev, item]);
    }
  }

  function removeStudentItem(
    combatClass: CombatClass,
    studentItem: StudentItem,
  ) {
    if (combatClass === "striker") {
      setStrikers((prev) => prev.filter((item) => item.id !== studentItem.id));
    }

    if (combatClass === "special") {
      setSpecials((prev) => prev.filter((item) => item.id !== studentItem.id));
    }
  }

  function updateStudentItem(
    combatClass: CombatClass,
    studentItem: StudentItem,
    newData: Omit<StudentItem, "student" | "id">,
  ) {
    if (combatClass === "striker") {
      setStrikers((prev) =>
        prev.map((item) => {
          if (item.id === studentItem.id) {
            return {
              ...item,
              ...newData,
            };
          }

          return item;
        }),
      );
    }

    if (combatClass === "special") {
      setSpecials((prev) =>
        prev.map((item) => {
          if (item.id === studentItem.id) {
            return {
              ...item,
              ...newData,
            };
          }

          return item;
        }),
      );
    }
  }

  function addEmptyCard(combatClass: CombatClass) {
    const item: StudentItem = {
      id: uuid(),
    };

    if (combatClass === "striker") {
      setStrikers((prev) => [...prev, item]);
    }

    if (combatClass === "special") {
      setSpecials((prev) => [...prev, item]);
    }
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
    if (strikers.length === 0 && specials.length === 0) {
      toast.error(t("tools.formationDisplay.toasts.noStudents"));
      return;
    }

    if (requestInProgress) {
      return;
    }

    setRequestInProgress(true);

    const data = {
      name: name.length > 0 ? name : undefined,
      strikers: strikers.map((item) => ({
        studentId: item.student?.id,
        starter: item.starter,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        borrowed: item.borrowed,
        level: item.level,
      })),
      specials: specials.map((item) => ({
        studentId: item.student?.id,
        starter: item.starter,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        borrowed: item.borrowed,
        level: item.level,
      })),
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

    setStrikers(newStrikers);
    setSpecials(newSpecials);
  }

  useEffect(() => {
    if (!formationId) {
      // reset
      setNameUnchecked("");
      setStrikersUnchecked([]);
      setSpecialsUnchecked([]);
      setScaleUnchecked(1);
      setDisplayOverlineUnchecked(false);
      setDisplayRoleIconUnchecked(true);
      setGroupsVerticalUnchecked(false);
      return;
    }

    if (query.status === "success") {
      const newStrikers: StudentItem[] = [];
      const newSpecials: StudentItem[] = [];

      for (const item of query.data.strikers) {
        const student = allStudents.find((s) => s.id === item.studentId);

        if (student) {
          newStrikers.push({
            id: uuid(),
            student,
            starter: item.starter,
            starLevel: item.starLevel,
            ueLevel: item.ueLevel,
            borrowed: item.borrowed,
            level: item.level,
          });
        } else {
          newStrikers.push({
            id: uuid(),
          });
        }
      }

      for (const item of query.data.specials) {
        const student = allStudents.find((s) => s.id === item.studentId);

        if (student) {
          newSpecials.push({
            id: uuid(),
            student,
            starter: item.starter,
            starLevel: item.starLevel,
            ueLevel: item.ueLevel,
            borrowed: item.borrowed,
            level: item.level,
          });
        } else {
          newSpecials.push({
            id: uuid(),
          });
        }
      }

      setNameUnchecked(query.data.name || "");
      setStrikersUnchecked(newStrikers);
      setSpecialsUnchecked(newSpecials);
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
    if (strikers.length > 0 || specials.length > 0) {
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
  }, [preferences]);

  if (formationId && query.status === "pending") {
    return <MessageBox>{t("tools.formationDisplay.loadingFormation")}</MessageBox>;
  }

  return (
    <div className="flex flex-col gap-10">
      <div
        className={cn("md:w-2/3 mx-auto -mt-6 flex flex-col gap-4", {
          hidden: strikers.length + specials.length > 0,
        })}
      >
        <p>
          {t("tools.formationDisplay.descriptionLong")}
        </p>
        <p className="md:hidden text-muted-foreground">
          {t.rich("tools.formationDisplay.mobileNotice", { strong: (children) => <strong>{children}</strong> })}
        </p>
        <p className="text-muted-foreground">
          {t.rich("tools.formationDisplay.renderNotice", { strong: (children) => <strong>{children}</strong> })}
        </p>
      </div>

      <FormationPreview
        containerRef={containerRef}
        strikers={strikers}
        specials={specials}
        displayOverline={displayOverline}
        noDisplayRole={!displayRoleIcon}
        groupsVertical={groupsVertical}
        busy={generationInProgress}
      />

      <Card className="md:w-2/3 mx-auto">
        <CardContent>
          <Tabs defaultValue="items" className="gap-4">
            <TabsList className="place-self-center">
              <TabsTrigger value="items">{t("tools.formationDisplay.tabs.items")}</TabsTrigger>
              <TabsTrigger value="appearance">{t("tools.formationDisplay.tabs.appearance")}</TabsTrigger>
              <Authenticated>
                <TabsTrigger value="cloud">{t("tools.formationDisplay.tabs.cloud")}</TabsTrigger>
              </Authenticated>
            </TabsList>

            <TabsContent value="items">
              <div className="flex flex-col gap-4">
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
              <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-center">
                <div className="flex gap-2 items-center">
                  <Label>{t("common.scale")}</Label>

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
                  <Label htmlFor="display-overline">{t("tools.formationDisplay.displayOverline")}</Label>
                </div>

                <div className="flex gap-2 items-center">
                  <Switch
                    id="display-role-icon"
                    checked={displayRoleIcon}
                    onCheckedChange={setDisplayRoleIcon}
                  />
                  <Label htmlFor="display-role-icon">{t("tools.formationDisplay.displayRoleIcon")}</Label>
                </div>

                <div className="flex gap-2 items-center">
                  <Switch
                    id="groups-vertical"
                    checked={groupsVertical}
                    onCheckedChange={setGroupsVertical}
                  />
                  <Label htmlFor="groups-vertical">{t("tools.formationDisplay.verticalGroups")}</Label>
                </div>
              </div>
            </TabsContent>

            <Authenticated>
              <TabsContent value="cloud">
                <div className="flex gap-6 items-center justify-center">
                  <div className="flex gap-2 items-center shrink-0 w-full max-w-md">
                    <Label className="shrink-0">{t("tools.formationDisplay.formationName")}</Label>
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
                    {formationId ? t("tools.formationDisplay.updateFormation") : t("tools.formationDisplay.saveFormation")}
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
          disabled={
            (strikers.length === 0 && specials.length === 0) ||
            generationInProgress
          }
        >
          {t("common.downloadImage")}
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">{t("tools.formationDisplay.strikers")}</h2>

        {strikers.length === 0 && (
          <p className="text-muted-foreground">{t("tools.formationDisplay.noStrikers")}</p>
        )}

        {strikers.length > 0 && (
          <FormationItemContainer
            items={strikers}
            setItems={setStrikers}
            onWantsToRemove={(item) => removeStudentItem("striker", item)}
            onWantsToUpdate={(item, newData) =>
              updateStudentItem("striker", item, newData)
            }
          />
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">{t("tools.formationDisplay.specials")}</h2>

        {specials.length === 0 && (
          <p className="text-muted-foreground">{t("tools.formationDisplay.noSpecials")}</p>
        )}

        {specials.length > 0 && (
          <FormationItemContainer
            items={specials}
            setItems={setSpecials}
            onWantsToRemove={(item) => removeStudentItem("special", item)}
            onWantsToUpdate={(item, newData) =>
              updateStudentItem("special", item, newData)
            }
          />
        )}
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
