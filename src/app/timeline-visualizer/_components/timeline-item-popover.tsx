"use client";

import { TimelineItemTargetPicker } from "@/app/timeline-visualizer/_components/timeline-item-target-picker";
import type { TimelineItem } from "@/app/timeline-visualizer/_components/timeline-preview";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type SkillCardVariant, skillCardVariantMap } from "@/lib/skill-card";
import type { Student } from "~prisma";
import {
  ChevronsUpDownIcon,
  CopyIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import {
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import { useTranslations } from "next-intl";

function isTimelinePreviewAnchorTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest("[data-timeline-preview-anchor]");
}

export type TimelineItemPopoverProps = {
  item: TimelineItem;
  setItems: React.Dispatch<SetStateAction<TimelineItem[]>>;
  onWantsToRemove(itemId: string): void;
  onWantsToUpdate(
    itemId: string,
    data: Omit<TimelineItem, "type" | "student" | "id">,
  ): void;
  uniqueStudents?: Student[];
  onTriggerKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Focus trigger input after open (e.g. new student with auto-focus preference) */
  autoFocusTrigger?: boolean;
  onAutoFocusTriggerConsumed?: () => void;
};

export function TimelineItemPopover({
  item,
  setItems,
  onWantsToRemove,
  onWantsToUpdate,
  uniqueStudents = [],
  onTriggerKeyDown,
  autoFocusTrigger = false,
  onAutoFocusTriggerConsumed,
}: TimelineItemPopoverProps) {
  const t = useTranslations();

  const [separatorOverride, setSeparatorOverride] = useState(
    item.type === "separator" && typeof item.size === "number",
  );
  const [separatorSizeStr, setSeparatorSizeStr] = useState<string | undefined>(
    item.type === "separator" ? item.size?.toString() : undefined,
  );

  const handleRemove = useCallback(() => {
    onWantsToRemove(item.id);
  }, [onWantsToRemove, item.id]);

  const handleTriggerUpdate = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.value === "") {
        onWantsToUpdate(item.id, { trigger: undefined });
        return;
      }
      onWantsToUpdate(item.id, { trigger: event.target.value });
    },
    [onWantsToUpdate, item.id],
  );

  const handleTargetUpdate = useCallback(
    (student: Student | null) => {
      if (item.type !== "student") return;
      if (!student || student.id === item.target?.id) {
        onWantsToUpdate(item.id, { target: undefined });
        return;
      }
      onWantsToUpdate(item.id, { target: student });
    },
    [item, onWantsToUpdate],
  );

  const handleVariantUpdate = useCallback(
    (variantId: string) => {
      if (variantId === "default") {
        onWantsToUpdate(item.id, { variantId: undefined });
        return;
      }
      onWantsToUpdate(item.id, { variantId });
    },
    [onWantsToUpdate, item.id],
  );

  const handleCopyUpdate = useCallback(
    (checked: boolean) => {
      onWantsToUpdate(item.id, { copy: checked });
    },
    [onWantsToUpdate, item.id],
  );

  const handleNotesUpdate = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (event.target.value === "") {
        onWantsToUpdate(item.id, { notes: undefined });
        return;
      }
      onWantsToUpdate(item.id, { notes: event.target.value });
    },
    [onWantsToUpdate, item.id],
  );

  const handleTextUpdate = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onWantsToUpdate(item.id, { text: event.target.value });
    },
    [onWantsToUpdate, item.id],
  );

  const duplicate = useCallback(() => {
    const newItem: TimelineItem = {
      ...item,
      id: uuid(),
    };
    setItems((prev) => [...prev, newItem]);
  }, [item, setItems]);

  const skillVariants = useMemo(() => {
    if (item.type !== "student") return [];
    const variants = skillCardVariantMap[item.student.id as SkillCardVariant];
    if (!variants) return [];
    return variants;
  }, [item]);

  useLayoutEffect(() => {
    if (item.type !== "student" || !autoFocusTrigger) return;
    let consumed = false;
    const finish = () => {
      if (consumed) return;
      consumed = true;
      onAutoFocusTriggerConsumed?.();
    };
    const tryFocus = () => {
      const el = document.getElementById(
        `pop-trigger-${item.id}`,
      ) as HTMLInputElement | null;
      if (!el) return;
      el.focus();
      finish();
    };
    tryFocus();
    const frame = requestAnimationFrame(tryFocus);
    const timeout = window.setTimeout(() => {
      tryFocus();
      finish();
    }, 100);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [item.id, item.type, autoFocusTrigger, onAutoFocusTriggerConsumed]);

  useEffect(() => {
    if (!separatorOverride) {
      onWantsToUpdate(item.id, { size: undefined });
    } else if (typeof separatorSizeStr === "string") {
      const value = Number.parseInt(separatorSizeStr, 10);
      if (!Number.isNaN(value)) {
        onWantsToUpdate(item.id, { size: value });
      }
    }
  }, [separatorOverride]);

  useEffect(() => {
    if (item.type !== "separator" || !separatorOverride) return;
    const value = Number.parseInt(separatorSizeStr ?? "", 10);
    if (!Number.isNaN(value)) {
      onWantsToUpdate(item.id, { size: value });
    }
  }, [separatorSizeStr]);

  return (
    <PopoverContent
      className="w-80 flex flex-col gap-3"
      onOpenAutoFocus={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => {
        if (isTimelinePreviewAnchorTarget(e.target)) e.preventDefault();
      }}
      onFocusOutside={(e) => {
        if (isTimelinePreviewAnchorTarget(e.target)) e.preventDefault();
      }}
    >
      {item.type === "student" && (
        <>
          <div className="font-semibold text-base">{item.student.name}</div>

          {skillVariants.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="shrink-0" htmlFor={`pop-variant-${item.id}`}>
                {t("tools.timeline.editor.student.variant.label")}
              </Label>
              <Select
                value={item.variantId ?? "default"}
                onValueChange={handleVariantUpdate}
              >
                <SelectTrigger className="flex-1">
                  {skillVariants.find((v) => v.id === item.variantId)?.name ??
                    t("tools.timeline.editor.student.variant.default")}
                </SelectTrigger>
                <SelectContent>
                  {skillVariants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Label className="shrink-0" htmlFor={`pop-trigger-${item.id}`}>
              {t("tools.timeline.editor.student.trigger.label")}
            </Label>
            <Input
              id={`pop-trigger-${item.id}`}
              value={item.trigger ?? ""}
              placeholder={t(
                "tools.timeline.editor.student.trigger.placeholder",
              )}
              onChange={handleTriggerUpdate}
              onKeyDown={onTriggerKeyDown}
              className="flex-1"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label className="shrink-0" htmlFor={`pop-target-${item.id}`}>
                {t("tools.timeline.editor.student.target.label")}
              </Label>
              <StudentPicker
                onStudentSelected={handleTargetUpdate}
                className="w-full z-[60]"
              >
                <Button
                  variant="outline"
                  className="flex-1 justify-between"
                >
                  {item.target
                    ? item.target.name
                    : t("tools.timeline.editor.student.target.select")}
                  <ChevronsUpDownIcon />
                </Button>
              </StudentPicker>
              {item.target && (
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleTargetUpdate(null)}
                >
                  <XIcon />
                </Button>
              )}
            </div>
            {uniqueStudents.length > 0 && (
              <TimelineItemTargetPicker
                student={item.student}
                uniqueStudents={uniqueStudents}
                currentTarget={item.target}
                onToggle={handleTargetUpdate}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id={`pop-copy-${item.id}`}
              checked={!!item.copy}
              onCheckedChange={handleCopyUpdate}
            />
            <Label className="shrink-0" htmlFor={`pop-copy-${item.id}`}>
              {t("tools.timeline.editor.student.copy.label")}
            </Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`pop-notes-${item.id}`}>
              {t("tools.timeline.editor.student.notes.label")}
            </Label>
            <Textarea
              id={`pop-notes-${item.id}`}
              value={item.notes ?? ""}
              placeholder={t(
                "tools.timeline.editor.student.notes.placeholder",
              )}
              onChange={handleNotesUpdate}
              className="resize-none min-h-16"
            />
          </div>
        </>
      )}

      {item.type === "separator" && (
        <>
          <div className="font-semibold text-base">
            {t(
              `tools.timeline.editor.separator.title.${item.orientation}`,
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id={`pop-sizeOverride-${item.id}`}
              checked={separatorOverride}
              onCheckedChange={(checked) => setSeparatorOverride(checked)}
            />
            <Label
              className="shrink-0"
              htmlFor={`pop-sizeOverride-${item.id}`}
            >
              {t("tools.timeline.editor.separator.size.toggle")}
            </Label>
          </div>

          {separatorOverride && (
            <Input
              type="number"
              value={separatorSizeStr ?? ""}
              placeholder={t(
                "tools.timeline.editor.separator.size.placeholder",
              )}
              onChange={(e) => setSeparatorSizeStr(e.target.value)}
            />
          )}
        </>
      )}

      {item.type === "text" && (
        <Textarea
          value={item.text}
          placeholder={t("tools.timeline.editor.text.placeholder")}
          onChange={handleTextUpdate}
          className="resize-none min-h-20"
        />
      )}

      <Separator />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={duplicate}
          className="flex-1"
        >
          <CopyIcon className="size-4" />
          {t("tools.timeline.editor.actions.duplicate")}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleRemove}
          className="flex-1"
        >
          <Trash2Icon className="size-4" />
          {t("tools.timeline.editor.actions.remove")}
        </Button>
      </div>
    </PopoverContent>
  );
}
