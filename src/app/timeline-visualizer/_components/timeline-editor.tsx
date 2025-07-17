"use client";

import { TimelineItemContainer } from "@/app/timeline-visualizer/_components/timeline-item-container";
import {
  type TimelineItem,
  TimelinePreview,
} from "@/app/timeline-visualizer/_components/timeline-preview";
import { TimelineQuickAdd } from "@/app/timeline-visualizer/_components/timeline-quick-add";
import { StudentPicker } from "@/components/common/student-picker";
import { ExportTimelineDataDialog } from "@/components/dialogs/export-timeline-data-dialog";
import { ImportTimelineDataDialog } from "@/components/dialogs/import-timeline-data-dialog";
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
import { trimTransparentPixels } from "@/lib/canvas";
import { sleep } from "@/lib/sleep";
import { timelineStorage } from "@/lib/storage/timeline";
import type { Student } from "@prisma/client";
import html2canvas from "html2canvas-pro";
import { ChevronsUpDownIcon, ChevronUpIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

export type TimelineEditorProps = {
  allStudents: Student[];
};

export function TimelineEditor({ allStudents }: TimelineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<TimelineItem[]>([]);

  const [scale, setScale] = useState(1);
  const [itemSpacing, setItemSpacing] = useState(10);
  const [verticalSeparatorSize, setVerticalSeparatorSize] = useState(70);
  const [horizontalSeparatorSize, setHorizontalSeparatorSize] = useState(50);

  const [itemSpacingStr, setItemSpacingStr] = useState(itemSpacing.toString());
  const [verticalSeparatorSizeStr, setVerticalSeparatorSizeStr] = useState(
    verticalSeparatorSize.toString(),
  );
  const [horizontalSeparatorSizeStr, setHorizontalSeparatorSizeStr] = useState(
    horizontalSeparatorSize.toString(),
  );

  const [generationInProgress, setGenerationInProgress] = useState(false);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const uniqueStudents = useMemo(() => {
    const studentsSet = new Set<Student>();

    items.forEach((item) => {
      if (item.type === "student" && item.student) {
        studentsSet.add(item.student);
      }
    });

    return Array.from(studentsSet);
  }, [items]);

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

  function addText() {
    setItems((prev) => [
      ...prev,
      {
        type: "text",
        id: uuid(),
        text: "Enter text",
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

    const trimmedCanvas = trimTransparentPixels(canvas);

    const src = trimmedCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = src;
    link.download = "timeline.png";
    link.click();

    setGenerationInProgress(false);
  }

  function loadTimelineFromStorage() {
    const storedData = timelineStorage.get();
    if (!storedData) {
      toast.warning("Nothing to load.");
      return;
    }

    const newItems: TimelineItem[] = [];

    for (const item of storedData.items) {
      if (item.type === "student" && item.studentId) {
        const student = allStudents.find((s) => s.id === item.studentId);
        if (!student) {
          continue;
        }

        let target: Student | undefined = undefined;
        if (item.targetId) {
          target = allStudents.find((s) => s.id === item.targetId);
        }

        newItems.push({
          type: "student",
          id: uuid(),
          student,
          target,
          copy: item.copy,
          trigger: item.trigger,
        });
      } else if (item.type !== "student") {
        newItems.push({
          ...item,
          id: uuid(),
        });
      }
    }

    setItems(newItems);
    setScale(storedData.scale || 1);
    setItemSpacing(storedData.itemSpacing || 10);
    setVerticalSeparatorSize(storedData.verticalSeparatorSize || 70);
    setHorizontalSeparatorSize(storedData.horizontalSeparatorSize || 50);
    setItemSpacingStr((storedData.itemSpacing || 10).toString());
    setVerticalSeparatorSizeStr(
      (storedData.verticalSeparatorSize || 70).toString(),
    );
    setHorizontalSeparatorSizeStr(
      (storedData.horizontalSeparatorSize || 50).toString(),
    );
  }

  function saveTimelineToStorage(showToast = true) {
    const data = {
      items: items.map((item) => {
        if (item.type === "student") {
          return {
            ...item,
            id: undefined,
            student: undefined,
            target: undefined,
            studentId: item.student.id,
            targetId: item.target?.id,
          };
        }

        return {
          ...item,
          id: undefined,
        };
      }),
      scale,
      itemSpacing,
      verticalSeparatorSize,
      horizontalSeparatorSize,
    };

    timelineStorage.set(data);

    if (showToast) {
      toast.success("Timeline saved successfully.");
    }
  }

  function handlePreviewItemClicked(item: TimelineItem) {
    setHighlightedId(item.id);

    const element = document.getElementById(item.id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }

  function goToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const value = Number.parseInt(itemSpacingStr, 10);
    if (!Number.isNaN(value)) {
      setItemSpacing(value);
    }
  }, [itemSpacingStr]);

  useEffect(() => {
    const value = Number.parseInt(verticalSeparatorSizeStr, 10);
    if (!Number.isNaN(value)) {
      setVerticalSeparatorSize(value);
    }
  }, [verticalSeparatorSizeStr]);

  useEffect(() => {
    const value = Number.parseInt(horizontalSeparatorSizeStr, 10);
    if (!Number.isNaN(value)) {
      setHorizontalSeparatorSize(value);
    }
  }, [horizontalSeparatorSizeStr]);

  return (
    <div className="flex flex-col gap-10">
      <TimelinePreview
        containerRef={containerRef}
        items={items}
        itemSpacing={itemSpacing}
        verticalSeparatorSize={verticalSeparatorSize}
        horizontalSeparatorSize={horizontalSeparatorSize}
        busy={generationInProgress}
        onItemClicked={handlePreviewItemClicked}
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
            value={itemSpacingStr}
            onChange={(e) => setItemSpacingStr(e.target.value)}
            className="w-20"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Label>Vertical Separator Size</Label>

          <Input
            type="number"
            value={verticalSeparatorSizeStr}
            onChange={(e) => setVerticalSeparatorSizeStr(e.target.value)}
            className="w-20"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Label>Horizontal Separator Size</Label>

          <Input
            type="number"
            value={horizontalSeparatorSizeStr}
            onChange={(e) => setHorizontalSeparatorSizeStr(e.target.value)}
            className="w-20"
          />
        </div>
      </div>

      <Separator />

      <TimelineQuickAdd students={uniqueStudents} onStudentClick={addStudent} />

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

          <Button variant="outline" onClick={addText}>
            Add Text
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center justify-center">
        <Button variant="outline" onClick={loadTimelineFromStorage}>
          Load
        </Button>

        <Button variant="outline" onClick={() => saveTimelineToStorage()}>
          Save
        </Button>

        <ExportTimelineDataDialog
          onBeforeLoad={() => saveTimelineToStorage(false)}
        >
          <Button variant="outline">Export</Button>
        </ExportTimelineDataDialog>

        <ImportTimelineDataDialog onComplete={loadTimelineFromStorage}>
          <Button variant="outline">Import</Button>
        </ImportTimelineDataDialog>

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
            uniqueStudents={uniqueStudents}
            highlightedId={highlightedId}
          />
        </div>
      )}

      <Button
        size="sm"
        className="rounded-full fixed bottom-4 right-4 z-50 w-12 h-12 cursor-pointer"
        onClick={goToTop}
      >
        <ChevronUpIcon className="size-6" />
      </Button>
    </div>
  );
}
