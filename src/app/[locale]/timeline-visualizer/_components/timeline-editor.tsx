"use client";

import { useUser } from "@clerk/nextjs";
import { Authenticated, useMutation } from "convex/react";
import html2canvas from "html2canvas-pro";
import {
  ChevronsUpDownIcon,
  ChevronUpIcon,
  ImageUpIcon,
  SaveIcon,
  ShareIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import slugify from "slugify";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { FormationRowsReadonly } from "@/app/[locale]/formation-display/_components/formation-rows-readonly";
import { TimelineDownloadButton } from "@/app/[locale]/timeline-visualizer/_components/timeline-download-button";
import { TimelineFormationSection } from "@/app/[locale]/timeline-visualizer/_components/timeline-formation-section";
import {
  type TimelineInsertKind,
  type TimelineItem,
  TimelinePreview,
} from "@/app/[locale]/timeline-visualizer/_components/timeline-preview";
import { TimelineQuickAdd } from "@/app/[locale]/timeline-visualizer/_components/timeline-quick-add";
import { TimelineRaidSection } from "@/app/[locale]/timeline-visualizer/_components/timeline-raid-section";
import { TimelineTextMenu } from "@/app/[locale]/timeline-visualizer/_components/timeline-text-menu";
import { TimelineTitleInput } from "@/app/[locale]/timeline-visualizer/_components/timeline-title-input";
import { useTimelineHistory } from "@/app/[locale]/timeline-visualizer/_hooks/use-timeline-history";
import { ExportBackgroundControls } from "@/components/common/export-background-controls";
import { MarkdownTips } from "@/components/common/markdown-tips";
import { MessageBox } from "@/components/common/message-box";
import { SaveStatus } from "@/components/common/save-status";
import {
  StudentPicker,
  type StudentPickerHandle,
} from "@/components/common/student-picker";
import { ExportTimelineDataDialog } from "@/components/dialogs/export-timeline-data-dialog";
import { ImportTimelineDataDialog } from "@/components/dialogs/import-timeline-data-dialog";
import { SaveDialog } from "@/components/dialogs/save-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getInitialAutoName, useAutoName } from "@/hooks/use-auto-name";
import { useDirtyStateTracker } from "@/hooks/use-dirty-state-tracker";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useUserPreferences } from "@/hooks/use-preferences";
import { useStudents } from "@/hooks/use-students";
import { useRouter } from "@/i18n/navigation";
import { clearCache } from "@/lib/cache";
import { compositeCanvasBackground, trimTransparentPixels } from "@/lib/canvas";
import { useQueryWithStatus } from "@/lib/convex";
import { decodePngItxt, encodePngWithItxt } from "@/lib/png-metadata";
import { compareRaids, type RaidInfo } from "@/lib/raid-info";
import type { RoadmapRaidItem } from "@/lib/roadmap/types";
import { prepareCdnImagesForScreenshot } from "@/lib/screenshot";
import { sleep } from "@/lib/sleep";
import {
  DEFAULT_EXPORT_BACKGROUND_COLOR,
  DEFAULT_EXPORT_BACKGROUND_OPACITY,
  DEFAULT_EXPORT_WITH_TRANSPARENT_BACKGROUND,
  type TimelineStorageData,
  timelineStorage,
} from "@/lib/storage/timeline";
import {
  compareFormationStates,
  formationSourceToState,
  formationStateToStoredData,
  getFormationStudents,
  hasFormationSlots,
  type TimelineFormationState,
} from "@/lib/timeline-formation";
import {
  deserializeTimelineItems,
  serializeTimelineItems,
} from "@/lib/timeline-items";
import { cn } from "@/lib/utils";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import type { Student } from "~prisma";

export type TimelineEditorProps = {
  roadmapRaids: RoadmapRaidItem[];
};

export function TimelineEditor({ roadmapRaids }: TimelineEditorProps) {
  const t = useTranslations();

  const { students: allStudents } = useStudents();

  const { isSignedIn } = useUser();

  const { hasUnsavedChanges, useSaveableState, markAsSaved } =
    useDirtyStateTracker();

  const [requestInProgress, setRequestInProgress] = useState(false);

  const navigationGuard = useNavigationGuard({
    enabled: hasUnsavedChanges && !requestInProgress,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const studentPickerRef = useRef<StudentPickerHandle>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { preferences } = useUserPreferences();

  const [name, setName, setNameUnchecked] = useSaveableState("");
  const [autoName, setAutoName, setAutoNameUnchecked] = useSaveableState(true);
  const [raid, setRaid, setRaidUnchecked] = useSaveableState<
    RaidInfo | undefined
  >(undefined, compareRaids);

  const { onNameChange, seedAutoName } = useAutoName({
    raid,
    autoName,
    setName,
    setAutoName,
  });

  const [visibility, setVisibility, setVisibilityUnchecked] = useSaveableState<
    "public" | "private"
  >(preferences.timelineVisualizer.defaultVisibility);
  const [showCreator, setShowCreator, setShowCreatorUnchecked] =
    useSaveableState(preferences.timelineVisualizer.defaultShowCreator);
  const [description, setDescription, setDescriptionUnchecked] =
    useSaveableState("");

  const [items, setItems, setItemsUnchecked] = useSaveableState<TimelineItem[]>(
    [],
    useCallback((a: TimelineItem[], b: TimelineItem[]) => {
      if (a.length !== b.length) {
        return false;
      }

      for (let i = 0; i < a.length; ++i) {
        const itemA = a[i];
        const itemB = b[i];

        if (itemA.id !== itemB.id || itemA.type !== itemB.type) {
          return false;
        }

        if (itemA.type === "student" && itemB.type === "student") {
          if (itemA.student.id !== itemB.student.id) {
            return false;
          }

          if (itemA.trigger !== itemB.trigger) {
            return false;
          }

          if (itemA.copy !== itemB.copy) {
            return false;
          }

          if (itemA.variantId !== itemB.variantId) {
            return false;
          }

          if (itemA.target?.id !== itemB.target?.id) {
            return false;
          }

          const extraA = (itemA.extraTargets ?? []).map((target) => target?.id);
          const extraB = (itemB.extraTargets ?? []).map((target) => target?.id);

          if (
            extraA.length !== extraB.length ||
            extraA.some((id, index) => id !== extraB[index])
          ) {
            return false;
          }

          if (itemA.notes !== itemB.notes) {
            return false;
          }
        }

        if (itemA.type === "separator" && itemB.type === "separator") {
          if (itemA.orientation !== itemB.orientation) {
            return false;
          }

          if (itemA.size !== itemB.size) {
            return false;
          }
        }

        if (itemA.type === "text" && itemB.type === "text") {
          if (itemA.text !== itemB.text) {
            return false;
          }
        }
      }

      return true;
    }, []),
  );

  const { undo, redo, resetHistory } = useTimelineHistory(items, setItems);

  const [scale, setScale, setScaleUnchecked] = useSaveableState(
    preferences.timelineVisualizer.defaultScale,
  );
  const [itemSpacing, setItemSpacing, setItemSpacingUnchecked] =
    useSaveableState(preferences.timelineVisualizer.defaultItemSpacing);
  const [
    verticalSeparatorSize,
    setVerticalSeparatorSize,
    setVerticalSeparatorSizeUnchecked,
  ] = useSaveableState(
    preferences.timelineVisualizer.defaultVerticalSeparatorSize,
  );
  const [
    horizontalSeparatorSize,
    setHorizontalSeparatorSize,
    setHorizontalSeparatorSizeUnchecked,
  ] = useSaveableState(
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

  const [
    exportWithTransparentBackground,
    setExportWithTransparentBackground,
    setExportWithTransparentBackgroundUnchecked,
  ] = useSaveableState(
    preferences.timelineVisualizer.defaultExportWithTransparentBackground,
  );
  const [
    exportBackgroundColor,
    setExportBackgroundColor,
    setExportBackgroundColorUnchecked,
  ] = useSaveableState(
    preferences.timelineVisualizer.defaultExportBackgroundColor,
  );
  const [
    exportBackgroundOpacity,
    setExportBackgroundOpacity,
    setExportBackgroundOpacityUnchecked,
  ] = useSaveableState(
    preferences.timelineVisualizer.defaultExportBackgroundOpacity,
  );

  const [formation, setFormation, setFormationUnchecked] =
    useSaveableState<TimelineFormationState | null>(
      null,
      compareFormationStates,
    );

  const [
    exportIncludeFormation,
    setExportIncludeFormation,
    setExportIncludeFormationUnchecked,
  ] = useSaveableState(true);

  const [generationInProgress, setGenerationInProgress] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [focusTriggerFieldItemId, setFocusTriggerFieldItemId] = useState<
    string | null
  >(null);
  const [focusTextFieldItemId, setFocusTextFieldItemId] = useState<
    string | null
  >(null);

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

  // The formation comes first, then anyone else used on the timeline.
  const uniqueStudents = useMemo(() => {
    const students = new Map<string, Student>();

    for (const student of getFormationStudents(formation)) {
      students.set(student.id, student);
    }

    for (const item of items) {
      if (item.type === "student" && item.student) {
        students.set(item.student.id, item.student);
      }
    }

    return Array.from(students.values());
  }, [
    formation,
    items,
  ]);

  const clearFocusTriggerFieldRequest = useCallback(() => {
    setFocusTriggerFieldItemId(null);
  }, []);

  const clearFocusTextFieldRequest = useCallback(() => {
    setFocusTextFieldItemId(null);
  }, []);

  const addStudent = useCallback(
    (student: Student) => {
      const id = uuid();
      setItems((prev) => [
        ...prev,
        {
          type: "student",
          id,
          student,
        },
      ]);
      if (preferences.timelineVisualizer.triggerAutoFocus) {
        setSelectedItemId(id);
        setFocusTriggerFieldItemId(id);
      }
    },
    [
      preferences.timelineVisualizer.triggerAutoFocus,
      setItems,
    ],
  );

  const addSeparator = useCallback((orientation: "horizontal" | "vertical") => {
    setItems((prev) => [
      ...prev,
      {
        type: "separator",
        id: uuid(),
        orientation,
      },
    ]);
  }, []);

  const addText = useCallback(() => {
    const id = uuid();
    setItems((prev) => [
      ...prev,
      {
        type: "text",
        id,
        text: "Enter text",
      },
    ]);
    setSelectedItemId(id);
    setFocusTextFieldItemId(id);
  }, []);

  const insertItemAfter = useCallback(
    (itemId: string, kind: TimelineInsertKind) => {
      const id = uuid();
      const newItem: TimelineItem =
        kind === "text"
          ? {
              type: "text",
              id,
              text: "Enter text",
            }
          : {
              type: "separator",
              id,
              orientation: kind,
            };

      setItems((prev) => {
        const index = prev.findIndex((item) => item.id === itemId);

        return index === -1
          ? [
              ...prev,
              newItem,
            ]
          : prev.toSpliced(index + 1, 0, newItem);
      });

      if (kind === "text") {
        setSelectedItemId(id);
        setFocusTextFieldItemId(id);
      }
    },
    [
      setItems,
    ],
  );

  const removeItem = useCallback((itemId: string) => {
    setSelectedItemId((prev) => (prev === itemId ? null : prev));
    setFocusTriggerFieldItemId((prev) => (prev === itemId ? null : prev));
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateItem = useCallback(
    (
      itemId: string,
      newData: Omit<TimelineItem, "type" | "student" | "id">,
    ) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                ...newData,
              }
            : i,
        ),
      );
    },
    [],
  );

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") {
        return;
      }
      if (!preferences.timelineVisualizer.triggerAutoFocus) {
        return;
      }
      e.preventDefault();
      setSelectedItemId(null);
      setFocusTriggerFieldItemId(null);
      studentPickerRef.current?.open();
    },
    [
      preferences.timelineVisualizer.triggerAutoFocus,
    ],
  );

  const editableConfig = useMemo(
    () => ({
      selectedItemId,
      onItemSelected: setSelectedItemId,
      setItems,
      onWantsToRemove: removeItem,
      onWantsToUpdate: updateItem,
      onWantsToInsertAfter: insertItemAfter,
      onUndo: undo,
      onRedo: redo,
      uniqueStudents,
      onTriggerKeyDown: handleTriggerKeyDown,
      focusTriggerFieldItemId,
      onFocusTriggerFieldConsumed: clearFocusTriggerFieldRequest,
      focusTextFieldItemId,
      onFocusTextFieldConsumed: clearFocusTextFieldRequest,
    }),
    [
      selectedItemId,
      setItems,
      removeItem,
      updateItem,
      insertItemAfter,
      undo,
      redo,
      uniqueStudents,
      handleTriggerKeyDown,
      focusTriggerFieldItemId,
      clearFocusTriggerFieldRequest,
      focusTextFieldItemId,
      clearFocusTextFieldRequest,
    ],
  );

  function buildTimelineData() {
    return {
      items: serializeTimelineItems(items),
      scale,
      itemSpacing,
      verticalSeparatorSize,
      horizontalSeparatorSize,
      exportWithTransparentBackground,
      exportBackgroundColor,
      exportBackgroundOpacity,
      name: name.length > 0 ? name : undefined,
      description: description.length > 0 ? description : undefined,
      formation: formationStateToStoredData(formation),
      exportIncludeFormation,
      raid,
      autoName: autoName && name.length > 0 ? true : undefined,
    };
  }

  async function getTimelineImage() {
    if (!containerRef.current || generationInProgress) {
      return;
    }

    setGenerationInProgress(true);
    setSelectedItemId(null);
    setFocusTriggerFieldItemId(null);

    try {
      await sleep(50);

      const canvas = await html2canvas(containerRef.current, {
        scale,
        backgroundColor: null,
        useCORS: true,
        onclone: prepareCdnImagesForScreenshot,
      });

      let trimmedCanvas = trimTransparentPixels(canvas);

      if (!exportWithTransparentBackground) {
        trimmedCanvas = compositeCanvasBackground(
          trimmedCanvas,
          exportBackgroundColor,
          exportBackgroundOpacity,
        );
      }

      const trimmedName = name.trim();
      const filename =
        trimmedName.length > 0
          ? slugify(trimmedName, {
              lower: true,
            })
          : "timeline";

      const blob = await encodePngWithItxt(
        trimmedCanvas,
        "ba-tools:timeline",
        JSON.stringify(buildTimelineData()),
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error(t("tools.timeline.exportFailed"));
    } finally {
      setGenerationInProgress(false);
    }
  }

  async function createOrUpdateCloudTimeline() {
    if (items.length === 0) {
      toast.error("Cannot create empty timeline.");
      return;
    }

    if (requestInProgress) {
      return;
    }

    setRequestInProgress(true);

    const data = {
      items: serializeTimelineItems(items),
      itemSpacing,
      verticalSeparatorSize,
      horizontalSeparatorSize,
      exportWithTransparentBackground,
      exportBackgroundColor,
      exportBackgroundOpacity,
      name: name.length > 0 ? name : undefined,
      description: description.length > 0 ? description : undefined,
      visibility,
      showCreator: visibility === "public" ? showCreator : false,
      formation: formationStateToStoredData(formation),
      formationId:
        hasFormationSlots(formation) && formation?.id
          ? (formation.id as Id<"formation">)
          : undefined,
      exportIncludeFormation,
      raid,
      autoName: autoName && name.length > 0 ? true : undefined,
    };

    if (timelineId) {
      await updateMutation({
        id: timelineId as Id<"timeline">,
        ...data,
      });

      markAsSaved();

      if (navigationGuard.active) {
        navigationGuard.accept();
      }

      await clearCache(`/timeline-visualizer?id=${timelineId}`);

      toast.success("Timeline saved successfully.");
    } else {
      const newTimeline = await createMutation(data);

      if (newTimeline) {
        markAsSaved();

        toast.success("Timeline created successfully.");

        if (!navigationGuard.active) {
          router.push(`/timeline-visualizer?id=${newTimeline._id}`);
        } else {
          navigationGuard.accept();
        }
      } else {
        toast.error("Failed to create timeline.");
      }
    }

    setRequestInProgress(false);
  }

  function loadTimelineFromStorage() {
    const storedData = timelineStorage.get();
    if (!storedData) {
      toast.warning("Nothing to load.");
      return;
    }

    const newItems = deserializeTimelineItems(storedData.items, allStudents);

    resetHistory();
    seedAutoName(storedData.raid);
    setRaidUnchecked(storedData.raid);
    setNameUnchecked(storedData.name ?? "");
    setAutoNameUnchecked(
      getInitialAutoName(storedData.name, storedData.autoName),
    );
    setDescriptionUnchecked(storedData.description ?? "");
    setItemsUnchecked(newItems);
    setFormationUnchecked(
      storedData.formation
        ? formationSourceToState(storedData.formation, allStudents)
        : null,
    );
    setExportIncludeFormationUnchecked(
      storedData.exportIncludeFormation ?? true,
    );
    setScaleUnchecked(storedData.scale || 1);
    setItemSpacingUnchecked(storedData.itemSpacing || 10);
    setVerticalSeparatorSizeUnchecked(storedData.verticalSeparatorSize || 70);
    setHorizontalSeparatorSizeUnchecked(
      storedData.horizontalSeparatorSize || 50,
    );
    setExportWithTransparentBackgroundUnchecked(
      storedData.exportWithTransparentBackground ??
        DEFAULT_EXPORT_WITH_TRANSPARENT_BACKGROUND,
    );
    setExportBackgroundColorUnchecked(
      storedData.exportBackgroundColor ?? DEFAULT_EXPORT_BACKGROUND_COLOR,
    );
    setExportBackgroundOpacityUnchecked(
      storedData.exportBackgroundOpacity ?? DEFAULT_EXPORT_BACKGROUND_OPACITY,
    );
    setItemSpacingStr((storedData.itemSpacing || 10).toString());
    setVerticalSeparatorSizeStr(
      (storedData.verticalSeparatorSize || 70).toString(),
    );
    setHorizontalSeparatorSizeStr(
      (storedData.horizontalSeparatorSize || 50).toString(),
    );
  }

  async function importFromImage(file: File) {
    try {
      const buffer = await file.arrayBuffer();
      const text = decodePngItxt(buffer, "ba-tools:timeline");

      if (!text) {
        toast.error(
          t("common.dialogs.importTimelineData.toasts.noDataInImage"),
        );
        return;
      }

      const data = JSON.parse(text) as TimelineStorageData;
      timelineStorage.set(data);
      loadTimelineFromStorage();
      toast.success(t("common.dialogs.importTimelineData.toasts.success"));
    } catch (err) {
      console.error(err);
      toast.error(t("common.dialogs.importTimelineData.toasts.invalidData"));
    }
  }

  function saveTimelineToLocalStorage(showToast = true) {
    if (requestInProgress) {
      return;
    }

    setRequestInProgress(true);

    timelineStorage.set(buildTimelineData());

    if (showToast) {
      toast.success("Timeline saved successfully.");
    }

    markAsSaved();

    if (navigationGuard.active) {
      navigationGuard.accept();
    }

    setRequestInProgress(false);
  }

  function goToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function copyLink() {
    const url = new URL(`/timelines/${timelineId}`, window.location.origin);
    await navigator.clipboard.writeText(url.toString());
    toast.success("Link copied to clipboard.");
  }

  async function save() {
    return isSignedIn
      ? createOrUpdateCloudTimeline()
      : saveTimelineToLocalStorage();
  }

  useEffect(() => {
    const value = Number.parseInt(itemSpacingStr, 10);
    if (!Number.isNaN(value)) {
      setItemSpacing(value);
    }
  }, [
    itemSpacingStr,
  ]);

  useEffect(() => {
    const value = Number.parseInt(verticalSeparatorSizeStr, 10);
    if (!Number.isNaN(value)) {
      setVerticalSeparatorSize(value);
    }
  }, [
    verticalSeparatorSizeStr,
  ]);

  useEffect(() => {
    const value = Number.parseInt(horizontalSeparatorSizeStr, 10);
    if (!Number.isNaN(value)) {
      setHorizontalSeparatorSize(value);
    }
  }, [
    horizontalSeparatorSizeStr,
  ]);

  useEffect(() => {
    if (!timelineId) {
      seedAutoName(undefined);
      setRaidUnchecked(undefined);
      setNameUnchecked("");
      setAutoNameUnchecked(true);
      setDescriptionUnchecked("");
      setVisibilityUnchecked(preferences.timelineVisualizer.defaultVisibility);
      setShowCreatorUnchecked(
        preferences.timelineVisualizer.defaultShowCreator,
      );
      resetHistory();
      setItemsUnchecked([]);
      setFormationUnchecked(null);
      setExportIncludeFormationUnchecked(true);
      setScaleUnchecked(1);
      setItemSpacingUnchecked(10);
      setVerticalSeparatorSizeUnchecked(70);
      setHorizontalSeparatorSizeUnchecked(50);
      setExportWithTransparentBackgroundUnchecked(
        preferences.timelineVisualizer.defaultExportWithTransparentBackground,
      );
      setExportBackgroundColorUnchecked(
        preferences.timelineVisualizer.defaultExportBackgroundColor,
      );
      setExportBackgroundOpacityUnchecked(
        preferences.timelineVisualizer.defaultExportBackgroundOpacity,
      );
      setItemSpacingStr("10");
      setVerticalSeparatorSizeStr("70");
      setHorizontalSeparatorSizeStr("50");
      return;
    }

    if (query.status === "success") {
      const newItems = deserializeTimelineItems(query.data.items, allStudents);

      resetHistory();
      seedAutoName(query.data.raid);
      setRaidUnchecked(query.data.raid);
      setNameUnchecked(query.data.name ?? "");
      setAutoNameUnchecked(
        getInitialAutoName(query.data.name, query.data.autoName),
      );
      setDescriptionUnchecked(query.data.description ?? "");
      setVisibilityUnchecked(query.data.visibility || "private");
      setShowCreatorUnchecked(query.data.showCreator || false);
      setItemsUnchecked(newItems);
      setFormationUnchecked(
        query.data.formation
          ? formationSourceToState(
              query.data.formation,
              allStudents,
              query.data.formationId,
            )
          : null,
      );
      setExportIncludeFormationUnchecked(
        query.data.exportIncludeFormation ?? true,
      );
      setItemSpacingUnchecked(query.data.itemSpacing || 10);
      setVerticalSeparatorSizeUnchecked(query.data.verticalSeparatorSize || 70);
      setHorizontalSeparatorSizeUnchecked(
        query.data.horizontalSeparatorSize || 50,
      );
      setExportWithTransparentBackgroundUnchecked(
        query.data.exportWithTransparentBackground ??
          DEFAULT_EXPORT_WITH_TRANSPARENT_BACKGROUND,
      );
      setExportBackgroundColorUnchecked(
        query.data.exportBackgroundColor ?? DEFAULT_EXPORT_BACKGROUND_COLOR,
      );
      setExportBackgroundOpacityUnchecked(
        query.data.exportBackgroundOpacity ?? DEFAULT_EXPORT_BACKGROUND_OPACITY,
      );
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
  }, [
    timelineId,
    query.status,
  ]);

  useEffect(() => {
    if (items.length > 0) {
      return;
    }

    setScaleUnchecked(preferences.timelineVisualizer.defaultScale);
    setVisibilityUnchecked(preferences.timelineVisualizer.defaultVisibility);
    setShowCreatorUnchecked(preferences.timelineVisualizer.defaultShowCreator);
    setItemSpacingUnchecked(preferences.timelineVisualizer.defaultItemSpacing);
    setVerticalSeparatorSizeUnchecked(
      preferences.timelineVisualizer.defaultVerticalSeparatorSize,
    );
    setHorizontalSeparatorSizeUnchecked(
      preferences.timelineVisualizer.defaultHorizontalSeparatorSize,
    );
    setExportWithTransparentBackgroundUnchecked(
      preferences.timelineVisualizer.defaultExportWithTransparentBackground,
    );
    setExportBackgroundColorUnchecked(
      preferences.timelineVisualizer.defaultExportBackgroundColor,
    );
    setExportBackgroundOpacityUnchecked(
      preferences.timelineVisualizer.defaultExportBackgroundOpacity,
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
  }, [
    preferences,
    items,
  ]);

  const canIncludeFormation = hasFormationSlots(formation);

  if (timelineId && query.status === "pending") {
    return <MessageBox>{t("tools.timeline.loading")}</MessageBox>;
  }

  return (
    <div className="flex flex-col gap-10">
      <div
        className={cn("-mt-6 flex flex-col gap-4", {
          hidden: items.length > 0,
        })}
      >
        <p>{t("tools.timeline.description")}</p>
        <p className="md:hidden text-muted-foreground">
          {t.rich("tools.timeline.mobileNotice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </p>
        <p className="text-muted-foreground">
          {t.rich("tools.timeline.notice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </p>
      </div>

      <div className="@container flex flex-col gap-4">
        <TimelineTitleInput value={name} onChange={onNameChange} />

        <div className="grid grid-cols-1 items-start gap-4 @5xl:grid-cols-2 @5xl:gap-6">
          <TimelineRaidSection
            raid={raid}
            setRaid={setRaid}
            roadmapRaids={roadmapRaids}
          />

          <TimelineFormationSection
            formation={formation}
            setFormation={setFormation}
          />
        </div>
      </div>

      <div
        className={cn("flex flex-col", {
          "gap-2": items.length > 0,
        })}
      >
        {items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("tools.timeline.clickToEditPreview")}{" "}
            <span className="pointer-coarse:hidden">
              {t("tools.timeline.selection.hint")}
            </span>
          </p>
        )}

        <TimelinePreview
          containerRef={containerRef}
          items={items}
          itemSpacing={itemSpacing}
          verticalSeparatorSize={verticalSeparatorSize}
          horizontalSeparatorSize={horizontalSeparatorSize}
          busy={generationInProgress}
          exportHeader={
            formation && canIncludeFormation && exportIncludeFormation ? (
              <FormationRowsReadonly
                className="w-max max-w-none"
                rows={formation.rows}
                type={formation.type}
                rowGap={formation.rowGap}
                displayOverline={formation.displayOverline}
                noDisplayRole={formation.noDisplayRole}
                groupsVertical={formation.groupsVertical}
              />
            ) : null
          }
          editableConfig={editableConfig}
        />
      </div>

      <Card>
        <CardContent>
          <Tabs defaultValue="items" className="gap-4">
            <TabsList className="place-self-center max-md:max-w-full max-md:justify-start max-md:overflow-x-auto">
              <TabsTrigger value="items">
                {t("tools.timeline.tabs.items.title")}
              </TabsTrigger>
              <Authenticated>
                <TabsTrigger value="settings">
                  {t("tools.timeline.tabs.settings.title")}
                </TabsTrigger>
              </Authenticated>
              <TabsTrigger value="appearance">
                {t("tools.timeline.tabs.appearance.title")}
              </TabsTrigger>
              <TabsTrigger value="save">
                {t("tools.timeline.tabs.save.title")}
              </TabsTrigger>
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
                <div className="flex gap-4 justify-center items-center max-md:flex-col">
                  <StudentPicker
                    ref={studentPickerRef}
                    onStudentSelected={addStudent}
                    className="w-[200px] md:w-[250px]"
                  >
                    <Button
                      variant="outline"
                      className="w-[200px] md:w-[250px] justify-between"
                    >
                      {t("tools.timeline.tabs.items.addStudent")}
                      <ChevronsUpDownIcon />
                    </Button>
                  </StudentPicker>

                  <div className="flex gap-4 items-center justify-center max-md:flex-wrap max-md:gap-2">
                    <Button
                      variant="outline"
                      onClick={() => addSeparator("horizontal")}
                    >
                      {t("tools.timeline.tabs.items.addHS")}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => addSeparator("vertical")}
                    >
                      {t("tools.timeline.tabs.items.addVS")}
                    </Button>

                    <Button variant="outline" onClick={addText}>
                      {t("tools.timeline.tabs.items.addText")}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <Authenticated>
              <TabsContent value="settings" className="flex flex-col gap-4">
                <div className="flex gap-4 max-md:flex-col">
                  <div className="flex gap-2 items-center">
                    <Label className="shrink-0">
                      {t("tools.timeline.tabs.settings.visibility")}
                    </Label>

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
                        <SelectItem value="private">
                          {t("tools.timeline.tabs.settings.private")}
                        </SelectItem>
                        <SelectItem value="public">
                          {t("tools.timeline.tabs.settings.public")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {visibility === "public" && (
                    <div className="flex gap-2 items-center">
                      <Label className="shrink-0">
                        {t("tools.timeline.tabs.settings.showCreator")}
                      </Label>

                      <Select
                        value={showCreator ? "yes" : "no"}
                        onValueChange={(val) => setShowCreator(val === "yes")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">{t("common.no")}</SelectItem>
                          <SelectItem value="yes">{t("common.yes")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">
                    {t.rich("tools.timeline.tabs.settings.description", {
                      small: (children) => (
                        <small className="text-muted-foreground text-xs">
                          {children}
                        </small>
                      ),
                    })}
                  </Label>

                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t(
                      "tools.timeline.tabs.settings.descriptionPlaceholder",
                    )}
                    className="resize-none min-h-24"
                  />

                  <MarkdownTips />
                </div>
              </TabsContent>
            </Authenticated>

            <TabsContent value="appearance">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-center">
                  <div className="flex gap-2 items-center">
                    <Label className="shrink-0">
                      {t("tools.timeline.tabs.appearance.scale")}
                    </Label>

                    <Select
                      value={scale.toString()}
                      onValueChange={(val) =>
                        setScale(Number.parseInt(val, 10))
                      }
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
                    <Label className="shrink-0">
                      {t("tools.timeline.tabs.appearance.itemSpacing")}
                    </Label>

                    <Input
                      type="number"
                      value={itemSpacingStr}
                      onChange={(e) => setItemSpacingStr(e.target.value)}
                      className="w-20"
                    />
                  </div>

                  <div className="flex gap-2 items-center">
                    <Label className="shrink-0">
                      {t("tools.timeline.tabs.appearance.vsSize")}
                    </Label>

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
                    <Label className="shrink-0">
                      {t("tools.timeline.tabs.appearance.hsSize")}
                    </Label>

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

                <ExportBackgroundControls
                  idPrefix="tl-export-bg"
                  transparentBackground={exportWithTransparentBackground}
                  backgroundColor={exportBackgroundColor}
                  backgroundOpacity={exportBackgroundOpacity}
                  onTransparentBackgroundChange={
                    setExportWithTransparentBackground
                  }
                  onBackgroundColorChange={setExportBackgroundColor}
                  onBackgroundOpacityChange={setExportBackgroundOpacity}
                  labels={{
                    transparentBackground: t(
                      "tools.timeline.tabs.appearance.exportWithTransparentBackground",
                    ),
                    backgroundColor: t(
                      "tools.timeline.tabs.appearance.exportBackgroundColor",
                    ),
                    backgroundOpacity: t(
                      "tools.timeline.tabs.appearance.exportBackgroundOpacity",
                    ),
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="save">
              <div className="flex gap-4 items-center justify-center max-md:flex-wrap max-md:gap-2">
                <Button variant="outline" onClick={loadTimelineFromStorage}>
                  {t("tools.timeline.tabs.save.loadLocal")}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => saveTimelineToLocalStorage()}
                >
                  {t("tools.timeline.tabs.save.saveLocal")}
                </Button>

                <ExportTimelineDataDialog
                  onBeforeLoad={() => saveTimelineToLocalStorage(false)}
                >
                  <Button variant="outline">
                    {t("tools.timeline.tabs.save.export")}
                  </Button>
                </ExportTimelineDataDialog>

                <ImportTimelineDataDialog onComplete={loadTimelineFromStorage}>
                  <Button variant="outline">
                    {t("tools.timeline.tabs.save.import")}
                  </Button>
                </ImportTimelineDataDialog>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      importFromImage(file);
                    }
                    e.target.value = "";
                  }}
                />

                <Button
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageUpIcon />
                  {t("tools.timeline.tabs.save.importFromImage")}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <div className="mt-4 flex items-center justify-center">
          <SaveStatus
            isDirty={hasUnsavedChanges}
            isSaving={requestInProgress}
          />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {query.data?.visibility === "public" && (
          <Button
            variant="outline"
            size="icon"
            title={t("tools.timeline.actions.share")}
            aria-label={t("tools.timeline.actions.share")}
            onClick={copyLink}
          >
            <ShareIcon />
          </Button>
        )}

        <TimelineTextMenu
          items={items}
          onImport={(parsedItems) => setItems(parsedItems)}
        />

        <Authenticated>
          <Button
            variant="outline"
            onClick={createOrUpdateCloudTimeline}
            disabled={generationInProgress}
          >
            <SaveIcon />
            {t("tools.timeline.actions.cloudSave")}
          </Button>
        </Authenticated>

        <TimelineDownloadButton
          label={t("tools.timeline.actions.download")}
          disabled={items.length === 0 || generationInProgress}
          onDownload={getTimelineImage}
          includeFormation={
            canIncludeFormation ? exportIncludeFormation : undefined
          }
          onIncludeFormationChange={setExportIncludeFormation}
        />
      </div>

      <Button
        size="sm"
        className="rounded-full fixed bottom-4 right-4 z-50 w-12 h-12 cursor-pointer"
        onClick={goToTop}
      >
        <ChevronUpIcon className="size-6" />
      </Button>

      <SaveDialog
        open={navigationGuard.active}
        closeOnSave={false}
        title={t("tools.timeline.confirmExit.title")}
        description={t(
          `tools.timeline.confirmExit.description.${isSignedIn ? "signedIn" : "signedOut"}`,
        )}
        onYes={save}
        onNo={navigationGuard.accept}
        onCancel={navigationGuard.reject}
      />
    </div>
  );
}
