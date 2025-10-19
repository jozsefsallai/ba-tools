"use client";

import {
  FormationPreview,
  type StudentItem,
} from "@/app/formation-display/_components/formation-preview";
import type { Student } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
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
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";

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

type CombatClass = "striker" | "special";

export function FormationEditor() {
  const { students: allStudents } = useStudents();

  const containerRef = useRef<HTMLDivElement>(null);

  const { preferences } = useUserPreferences();

  const [name, setName] = useState("");

  const [strikers, setStrikers] = useState<StudentItem[]>([]);
  const [specials, setSpecials] = useState<StudentItem[]>([]);

  const [scale, setScale] = useState(preferences.formationDisplay.defaultScale);
  const [displayOverline, setDisplayOverline] = useState(
    preferences.formationDisplay.defaultDisplayOverline,
  );
  const [displayRoleIcon, setDisplayRoleIcon] = useState(
    !preferences.formationDisplay.defaultNoDisplayRole,
  );
  const [groupsVertical, setGroupsVertical] = useState(
    preferences.formationDisplay.defaultGroupsVertical,
  );

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
      toast.error("You must add at least one student to the formation.");
      return;
    }

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

      await clearCache(`/formation-display?id=${formationId}`);

      toast.success("Formation updated successfully.");
    } else {
      const newFormation = await createMutation(data);

      if (newFormation) {
        toast.success("Formation created successfully.");
        router.push(`/formation-display?id=${newFormation._id}`);
      } else {
        toast.error("Failed to create formation.");
      }
    }
  }

  useEffect(() => {
    if (!formationId) {
      // reset
      setName("");
      setStrikers([]);
      setSpecials([]);
      setScale(1);
      setDisplayOverline(false);
      setDisplayRoleIcon(true);
      setGroupsVertical(false);
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

      setName(query.data.name || "");
      setStrikers(newStrikers);
      setSpecials(newSpecials);
      setScale(1);
      setDisplayOverline(query.data.displayOverline || false);
      setDisplayRoleIcon(!query.data.noDisplayRole);
      setGroupsVertical(query.data.groupsVertical || false);
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

    setScale(preferences.formationDisplay.defaultScale);
    setDisplayOverline(preferences.formationDisplay.defaultDisplayOverline);
    setDisplayRoleIcon(!preferences.formationDisplay.defaultNoDisplayRole);
    setGroupsVertical(preferences.formationDisplay.defaultGroupsVertical);
  }, [preferences]);

  if (formationId && query.status === "pending") {
    return <MessageBox>Loading formation...</MessageBox>;
  }

  return (
    <div className="flex flex-col gap-10">
      <div
        className={cn("md:w-2/3 mx-auto -mt-6 flex flex-col gap-4", {
          hidden: strikers.length + specials.length > 0,
        })}
      >
        <p>
          This tool allows you to generate an image of a student formation. This
          can be useful for cases such as designing clean YouTube thumbnails.
        </p>
        <p className="md:hidden text-muted-foreground">
          <strong>Note:</strong> This tool might not work well on mobile
          devices.
        </p>
        <p className="text-muted-foreground">
          <strong>Note:</strong> Dark mode extensions and zoom levels may cause
          rendering issues in the resulting image. If the generated image looks
          weird, try disabling any dark mode extensions you may have and using
          100% zoom.
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
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <Authenticated>
                <TabsTrigger value="cloud">Cloud</TabsTrigger>
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
                      Select Student
                      <ChevronsUpDownIcon />
                    </Button>
                  </StudentPicker>

                  <Button
                    variant="outline"
                    onClick={() => addEmptyCard("striker")}
                  >
                    <PlusIcon />
                    Empty Striker
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => addEmptyCard("special")}
                  >
                    <PlusIcon />
                    Empty Special
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance">
              <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-center">
                <div className="flex gap-2 items-center">
                  <Label>Scale</Label>

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
                  <Label htmlFor="display-overline">Display Overline</Label>
                </div>

                <div className="flex gap-2 items-center">
                  <Switch
                    id="display-role-icon"
                    checked={displayRoleIcon}
                    onCheckedChange={setDisplayRoleIcon}
                  />
                  <Label htmlFor="display-role-icon">Display Role Icon</Label>
                </div>

                <div className="flex gap-2 items-center">
                  <Switch
                    id="groups-vertical"
                    checked={groupsVertical}
                    onCheckedChange={setGroupsVertical}
                  />
                  <Label htmlFor="groups-vertical">Vertical Groups</Label>
                </div>
              </div>
            </TabsContent>

            <Authenticated>
              <TabsContent value="cloud">
                <div className="flex gap-6 items-center justify-center">
                  <div className="flex gap-2 items-center shrink-0 w-full max-w-md">
                    <Label className="shrink-0">Formation Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Untitled Formation"
                    />
                  </div>

                  <Button
                    onClick={createOrUpdateCloudFormation}
                    disabled={generationInProgress}
                  >
                    {formationId ? "Update Formation" : "Save Formation"}
                  </Button>
                </div>
              </TabsContent>
            </Authenticated>
          </Tabs>
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
          Download Image
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Strikers</h2>

        {strikers.length === 0 && (
          <p className="text-muted-foreground">No strikers in formation.</p>
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
        <h2 className="text-lg font-bold">Specials</h2>

        {specials.length === 0 && (
          <p className="text-muted-foreground">No specials in formation.</p>
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
    </div>
  );
}
