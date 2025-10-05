"use client";

import { TimelineItemContainer } from "@/app/timeline-visualizer/_components/timeline-item-container";
import {
  type TimelineItem,
  TimelinePreview,
} from "@/app/timeline-visualizer/_components/timeline-preview";
import { TimelineQuickAdd } from "@/app/timeline-visualizer/_components/timeline-quick-add";
import { MessageBox } from "@/components/common/message-box";
import {
  StudentPicker,
  type StudentPickerHandle,
} from "@/components/common/student-picker";
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
import { useQueryWithStatus } from "@/lib/convex";
import { sleep } from "@/lib/sleep";
import { timelineStorage } from "@/lib/storage/timeline";
import type { Student } from "@prisma/client";
import { Authenticated, useMutation } from "convex/react";
import html2canvas from "html2canvas-pro";
import { ChevronsUpDownIcon, ChevronUpIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import slugify from "slugify";
import { CopyTextTimelineButton } from "@/app/timeline-visualizer/_components/copy-text-timeline-button";
import { clearCache } from "@/lib/cache";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/use-preferences";

export type TimelineEditorProps = {
  allStudents: Student[];
};

export function TimelineEditor({ allStudents }: TimelineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const studentPickerRef = useRef<StudentPickerHandle>(null);

  const { preferences } = useUserPreferences();

  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  const [items, setItems] = useState<TimelineItem[]>([]);

  const [scale, setScale] = useState(
    preferences.timelineVisualizer.defaultScale,
  );
  const [itemSpacing, setItemSpacing] = useState(
    preferences.timelineVisualizer.defaultItemSpacing,
  );
  const [verticalSeparatorSize, setVerticalSeparatorSize] = useState(
    preferences.timelineVisualizer.defaultVerticalSeparatorSize,
  );
  const [horizontalSeparatorSize, setHorizontalSeparatorSize] = useState(
    preferences.timelineVisualizer.defaultHorizontalSeparatorSize,
  );

  const [itemSpacingStr, setItemSpacingStr] = useState(
    preferences.timelineVisualizer.defaultItemSpacing.toString(),
  );
  const [verticalSeparatorSizeStr, setVerticalSeparatorSizeStr] = useState(
    preferences.timelineVisualizer.defaultVerticalSeparatorSize.toString(),
  );
  const [horizontalSeparatorSizeStr, setHorizontalSeparatorSizeStr] = useState(
    preferences.timelineVisualizer.defaultHorizontalSeparatorSize.toString(),
  );

  const [generationInProgress, setGenerationInProgress] = useState(false);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [autofocusTrigger, setAutofocusTrigger] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const timelineId = searchParams.get("id");

  const query = useQueryWithStatus(
    api.timeline.getOwnById,
    timelineId && timelineId.length > 0
      ? {
          id: timelineId as Id<"timeline">,
        }
      : "skip",
  );

  const createMutation = useMutation(api.timeline.create);
  const updateMutation = useMutation(api.timeline.update);

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

    if (preferences.timelineVisualizer.triggerAutoFocus) {
      setAutofocusTrigger(true);
      setTimeout(() => {
        setAutofocusTrigger(false);
      }, 100);
    }
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

  function addItemBelow(below: TimelineItem, item: TimelineItem) {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === below.id);
      if (index === -1) {
        return prev;
      }

      const newItems = [...prev];
      newItems.splice(index, 0, item);
      return newItems;
    });
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

    const trimmedName = name.trim();
    const filename =
      trimmedName.length > 0
        ? slugify(trimmedName, {
            lower: true,
          })
        : "timeline";

    const src = trimmedCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = src;
    link.download = `${filename}.png`;
    link.click();

    setGenerationInProgress(false);
  }

  async function createOrUpdateCloudTimeline() {
    if (items.length === 0) {
      toast.error("Cannot create empty timeline.");
      return;
    }

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
      itemSpacing,
      verticalSeparatorSize,
      horizontalSeparatorSize,
      name: name.length > 0 ? name : undefined,
      visibility,
    };

    if (timelineId) {
      await updateMutation({
        id: timelineId as Id<"timeline">,
        ...data,
      });

      await clearCache(`/timeline-visualizer?id=${timelineId}`);

      toast.success("Timeline saved successfully.");
    } else {
      const newTimeline = await createMutation(data);

      if (newTimeline) {
        router.push(`/timeline-visualizer?id=${newTimeline._id}`);
        toast.success("Timeline created successfully.");
      } else {
        toast.error("Failed to create timeline.");
      }
    }
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
          variantId: item.variantId,
        });
      } else if (item.type !== "student") {
        newItems.push({
          ...item,
          id: uuid(),
        });
      }
    }

    setName(storedData.name ?? "");
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

  function saveTimelineToLocalStorage(showToast = true) {
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
      name: name.length > 0 ? name : undefined,
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

  async function copyLink() {
    const url = new URL(
      `/timeline-visualizer/${timelineId}`,
      window.location.origin,
    );
    await navigator.clipboard.writeText(url.toString());
    toast.success("Link copied to clipboard.");
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") {
      return;
    }

    if (!preferences.timelineVisualizer.triggerAutoFocus) {
      return;
    }

    e.preventDefault();
    studentPickerRef.current?.open();
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

  useEffect(() => {
    if (!timelineId) {
      // reset
      setName("");
      setItems([]);
      setScale(1);
      setItemSpacing(10);
      setVerticalSeparatorSize(70);
      setHorizontalSeparatorSize(50);
      setItemSpacingStr("10");
      setVerticalSeparatorSizeStr("70");
      setHorizontalSeparatorSizeStr("50");
      return;
    }

    if (query.status === "success") {
      const newItems: TimelineItem[] = [];

      for (const item of query.data.items) {
        if (item.type === "student") {
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
            variantId: item.variantId,
          });
        } else {
          newItems.push({
            ...item,
            id: uuid(),
          });
        }
      }

      setName(query.data.name ?? "");
      setVisibility(query.data.visibility || "private");
      setItems(newItems);
      setItemSpacing(query.data.itemSpacing || 10);
      setVerticalSeparatorSize(query.data.verticalSeparatorSize || 70);
      setHorizontalSeparatorSize(query.data.horizontalSeparatorSize || 50);
      setItemSpacingStr((query.data.itemSpacing || 10).toString());
      setVerticalSeparatorSizeStr(
        (query.data.verticalSeparatorSize || 70).toString(),
      );
      setHorizontalSeparatorSizeStr(
        (query.data.horizontalSeparatorSize || 50).toString(),
      );
    }

    if (query.status === "error") {
      toast.error("Failed to load timeline data.");
      router.push("/timeline-visualizer");
    }
  }, [timelineId, query.status]);

  useEffect(() => {
    if (items.length > 0) {
      return;
    }

    setScale(preferences.timelineVisualizer.defaultScale);
    setItemSpacing(preferences.timelineVisualizer.defaultItemSpacing);
    setVerticalSeparatorSize(
      preferences.timelineVisualizer.defaultVerticalSeparatorSize,
    );
    setHorizontalSeparatorSize(
      preferences.timelineVisualizer.defaultHorizontalSeparatorSize,
    );

    setItemSpacingStr(
      preferences.timelineVisualizer.defaultItemSpacing.toString(),
    );
    setVerticalSeparatorSizeStr(
      preferences.timelineVisualizer.defaultVerticalSeparatorSize.toString(),
    );
    setHorizontalSeparatorSizeStr(
      preferences.timelineVisualizer.defaultHorizontalSeparatorSize.toString(),
    );
  }, [preferences, items]);

  if (timelineId && query.status === "pending") {
    return <MessageBox>Loading timeline...</MessageBox>;
  }

  return (
    <div className="flex flex-col gap-10">
      <div
        className={cn("md:w-2/3 mx-auto -mt-6 flex flex-col gap-4", {
          hidden: items.length > 0,
        })}
      >
        <p>
          This tool allows you to create a visual rotation timeline (e.g. for a
          raid). You can select students, adjust the spacing between them, set
          the cost/timestamp at which the student's skill cost should be used,
          and more.
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

      <TimelinePreview
        containerRef={containerRef}
        items={items}
        itemSpacing={itemSpacing}
        verticalSeparatorSize={verticalSeparatorSize}
        horizontalSeparatorSize={horizontalSeparatorSize}
        busy={generationInProgress}
        onItemClicked={handlePreviewItemClicked}
      />

      <Card className="md:w-2/3 mx-auto">
        <CardContent>
          <Tabs defaultValue="items" className="gap-4">
            <TabsList className="place-self-center">
              <TabsTrigger value="items">Items</TabsTrigger>
              <Authenticated>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </Authenticated>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="save">Save/Export</TabsTrigger>
            </TabsList>

            <TabsContent
              value="items"
              className="flex flex-col gap-4 items-center justify-center"
            >
              <TimelineQuickAdd
                students={uniqueStudents}
                onStudentClick={addStudent}
              />

              <div className="flex flex-col gap-4">
                <div className="flex gap-4 justify-center items-center">
                  <StudentPicker
                    ref={studentPickerRef}
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
                    <Button
                      variant="outline"
                      onClick={() => addSeparator("horizontal")}
                    >
                      Add Horizontal Separator
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => addSeparator("vertical")}
                    >
                      Add Vertical Separator
                    </Button>

                    <Button variant="outline" onClick={addText}>
                      Add Text
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <Authenticated>
              <TabsContent
                value="settings"
                className="flex gap-4 items-center justify-center"
              >
                <div className="flex gap-2 items-center shrink-0 w-full max-w-md">
                  <Label className="shrink-0">Timeline Name</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Untitled Timeline"
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <Label>Visibility</Label>

                  <Select
                    value={visibility}
                    onValueChange={(val) =>
                      setVisibility(val as "public" | "private")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>

                  {query.data?.visibility === "public" && (
                    <Button variant="outline" onClick={copyLink}>
                      Copy Link
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Authenticated>

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
                    onChange={(e) =>
                      setVerticalSeparatorSizeStr(e.target.value)
                    }
                    className="w-20"
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <Label>Horizontal Separator Size</Label>

                  <Input
                    type="number"
                    value={horizontalSeparatorSizeStr}
                    onChange={(e) =>
                      setHorizontalSeparatorSizeStr(e.target.value)
                    }
                    className="w-20"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="save">
              <div className="flex gap-4 items-center justify-center">
                <Button variant="outline" onClick={loadTimelineFromStorage}>
                  Load Local
                </Button>

                <Button
                  variant="outline"
                  onClick={() => saveTimelineToLocalStorage()}
                >
                  Save Local
                </Button>

                <Authenticated>
                  <Button
                    variant="outline"
                    onClick={createOrUpdateCloudTimeline}
                    disabled={generationInProgress}
                  >
                    {timelineId ? "Update Cloud Data" : "Save to Cloud"}
                  </Button>
                </Authenticated>

                <ExportTimelineDataDialog
                  onBeforeLoad={() => saveTimelineToLocalStorage(false)}
                >
                  <Button variant="outline">Export</Button>
                </ExportTimelineDataDialog>

                <ImportTimelineDataDialog onComplete={loadTimelineFromStorage}>
                  <Button variant="outline">Import</Button>
                </ImportTimelineDataDialog>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex gap-4 items-center justify-center">
        <CopyTextTimelineButton items={items} />

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
            addItemBelow={addItemBelow}
            allStudents={allStudents}
            uniqueStudents={uniqueStudents}
            highlightedId={highlightedId}
            onTriggerKeyDown={handleTriggerKeyDown}
            autoFocusOnTriggerField={autofocusTrigger}
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
