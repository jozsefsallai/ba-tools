"use client";

import { TimelineItemContainer } from "@/app/timeline-visualizer/_components/timeline-item-container";
import {
  type TimelineItem,
  TimelinePreview,
} from "@/app/timeline-visualizer/_components/timeline-preview";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { sleep } from "@/lib/sleep";
import type { Student } from "@prisma/client";
import html2canvas from "html2canvas-pro";
import { ChevronsUpDownIcon } from "lucide-react";
import { useRef, useState } from "react";
import { v4 as uuid } from "uuid";

export type TimelineEditorProps = {
  allStudents: Student[];
};

export function TimelineEditor({ allStudents }: TimelineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<TimelineItem[]>([]);

  const [scale, setScale] = useState(1);
  const [itemSpacing, setItemSpacing] = useState(10);
  const [verticalSeparatorSize, setVerticalSeparatorSize] = useState(20);
  const [horizontalSeparatorSize, setHorizontalSeparatorSize] = useState(20);

  const [generationInProgress, setGenerationInProgress] = useState(false);

  function addStudent(student: Student) {
    setItems((prev) => [
      ...prev,
      {
        type: "student",
        id: uuid(),
        student,
      },
    ]);
  }

  function addSeparator(orientation: "horizontal" | "vertical") {
    setItems((prev) => [
      ...prev,
      {
        type: "separator",
        id: uuid(),
        orientation,
      },
    ]);
  }

  function removeItem(item: TimelineItem) {
    setItems((prev) => prev.filter((i) => i !== item));
  }

  function updateItem(
    item: TimelineItem,
    newData: Omit<TimelineItem, "type" | "student" | "id">,
  ) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...newData } : i)),
    );
  }

  async function getTimelineImage() {
    if (!containerRef.current || generationInProgress) {
      return;
    }

    setGenerationInProgress(true);

    await sleep(50);

    const canvas = await html2canvas(containerRef.current, {
      scale,
      backgroundColor: null,
    });

    const src = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = src;
    link.download = "timeline.png";
    link.click();

    setGenerationInProgress(false);
  }

  return (
    <div className="flex flex-col gap-10">
      <TimelinePreview
        containerRef={containerRef}
        items={items}
        itemSpacing={itemSpacing}
        verticalSeparatorSize={verticalSeparatorSize}
        horizontalSeparatorSize={horizontalSeparatorSize}
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
          <Label>Item Spacing</Label>

          <Input
            type="number"
            value={itemSpacing.toString()}
            onChange={(e) =>
              setItemSpacing(Number.parseInt(e.target.value, 10))
            }
            className="w-20"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Label>Vertical Separator Size</Label>

          <Input
            type="number"
            value={verticalSeparatorSize.toString()}
            onChange={(e) =>
              setVerticalSeparatorSize(Number.parseInt(e.target.value, 10))
            }
            className="w-20"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Label>Horizontal Separator Size</Label>

          <Input
            type="number"
            value={horizontalSeparatorSize.toString()}
            onChange={(e) =>
              setHorizontalSeparatorSize(Number.parseInt(e.target.value, 10))
            }
            className="w-20"
          />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Button
          onClick={getTimelineImage}
          disabled={items.length === 0 || generationInProgress}
        >
          Download Image
        </Button>
      </div>

      {items.length > 0 && <Separator />}

      {items.length > 0 && (
        <div className="flex flex-col gap-4">
          <TimelineItemContainer
            items={items}
            setItems={setItems}
            onWantsToRemove={removeItem}
            onWantsToUpdate={updateItem}
            allStudents={allStudents}
          />
        </div>
      )}

      <Separator />

      <div className="flex gap-4 justify-center items-center">
        <StudentPicker
          students={allStudents}
          onStudentSelected={addStudent}
          className="w-[200px] md:w-[250px]"
        >
          <Button
            variant="outline"
            className="w-[200px] md:w-[250px] justify-between"
          >
            Add Student
            <ChevronsUpDownIcon />
          </Button>
        </StudentPicker>

        <div className="flex gap-4 items-center justify-center">
          <Button variant="outline" onClick={() => addSeparator("horizontal")}>
            Add Horizontal Separator
          </Button>

          <Button variant="outline" onClick={() => addSeparator("vertical")}>
            Add Vertical Separator
          </Button>
        </div>
      </div>
    </div>
  );
}
