"use client";

import {
  FormationPreview,
  type StudentItem,
} from "@/app/formation-display/_components/formation-preview";
import type { Student } from "@/lib/types";
import { useRef, useState } from "react";
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
import { ChevronsUpDownIcon } from "lucide-react";

import { ExportStudentDataDialog } from "@/components/dialogs/export-student-data-dialog";
import { ImportStudentDataDialog } from "@/components/dialogs/import-student-data-dialog";
import { sleep } from "@/lib/sleep";
import { studentStorage } from "@/lib/storage/students";
import { StudentPicker } from "@/components/common/student-picker";
import { ImportJustinPlannerDataDialog } from "@/components/dialogs/import-justin-planner-data-dialog";
import { FormationItemContainer } from "@/app/formation-display/_components/formation-item-container";

export type FormationEditorProps = {
  allStudents: Student[];
};

type CombatClass = "striker" | "special";

export function FormationEditor({ allStudents }: FormationEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [strikers, setStrikers] = useState<StudentItem[]>([]);
  const [specials, setSpecials] = useState<StudentItem[]>([]);

  const [scale, setScale] = useState(1);
  const [displayOverline, setDisplayOverline] = useState(false);
  const [displayRoleIcon, setDisplayRoleIcon] = useState(true);

  const [generationInProgress, setGenerationInProgress] = useState(false);

  function addStudent(student: Student) {
    const item: StudentItem = {
      id: student.id,
      student,
    };

    const storedStudent = studentStorage.getStudent(student.id);
    if (storedStudent) {
      item.level = storedStudent.level;
      item.starLevel = storedStudent.starLevel;
      item.ueLevel = storedStudent.ueLevel;
    }

    if (student.combatClass === "Main") {
      if (strikers.find((item) => item.student === student)) {
        return;
      }

      setStrikers((prev) => [...prev, item]);
    }

    if (student.combatClass === "Support") {
      if (specials.find((item) => item.student === student)) {
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
      setStrikers((prev) => prev.filter((item) => item !== studentItem));
    }

    if (combatClass === "special") {
      setSpecials((prev) => prev.filter((item) => item !== studentItem));
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
          if (item === studentItem) {
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
          if (item === studentItem) {
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

  return (
    <div className="flex flex-col gap-10">
      <FormationPreview
        containerRef={containerRef}
        strikers={strikers}
        specials={specials}
        displayOverline={displayOverline}
        noDisplayRole={!displayRoleIcon}
        busy={generationInProgress}
      />

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
        <div className="flex gap-4 items-center justify-center">
          <StudentPicker
            students={allStudents}
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
        </div>

        <div className="flex gap-4 items-center justify-center">
          <ExportStudentDataDialog>
            <Button variant="outline">Export cached student data</Button>
          </ExportStudentDataDialog>

          <ImportStudentDataDialog>
            <Button variant="outline">Import cached student data</Button>
          </ImportStudentDataDialog>

          <ImportJustinPlannerDataDialog students={allStudents}>
            <Button variant="outline">Import Justin planner data</Button>
          </ImportJustinPlannerDataDialog>
        </div>
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
