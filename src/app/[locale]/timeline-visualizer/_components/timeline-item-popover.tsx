"use client";

import {
  CircleLetterCIcon,
  CopyPlusIcon,
  CornerRightDownIcon,
  MoveHorizontalIcon,
  PlusIcon,
  Trash2Icon,
  TypeIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type ReactNode,
  type SetStateAction,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { v4 as uuid } from "uuid";
import {
  StudentTile,
  TimelineItemTargetPicker,
} from "@/app/[locale]/timeline-visualizer/_components/timeline-item-target-picker";
import type {
  TimelineInsertKind,
  TimelineItem,
} from "@/app/[locale]/timeline-visualizer/_components/timeline-preview";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type SkillCardVariant, skillCardVariantMap } from "@/lib/skill-card";
import { cn } from "@/lib/utils";
import type { Student } from "~prisma";

const MAX_TIMELINE_TARGETS = 10;

function isTimelinePreviewAnchorTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("[data-timeline-preview-anchor]")
  );
}

function WithTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function IconAction({
  label,
  className,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <WithTooltip label={label}>
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-7 text-muted-foreground", className)}
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </Button>
    </WithTooltip>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <>
      <Label
        htmlFor={htmlFor}
        className="h-8 text-xs font-normal text-muted-foreground"
      >
        {label}
      </Label>
      <div className="min-w-0">{children}</div>
    </>
  );
}

export type TimelineItemPopoverProps = {
  item: TimelineItem;
  setItems: React.Dispatch<SetStateAction<TimelineItem[]>>;
  onWantsToRemove(itemId: string): void;
  onWantsToUpdate(
    itemId: string,
    data: Omit<TimelineItem, "type" | "student" | "id">,
  ): void;
  onWantsToInsertAfter(itemId: string, kind: TimelineInsertKind): void;
  uniqueStudents?: Student[];
  onTriggerKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Focus trigger input after open (e.g. new student with auto-focus preference) */
  autoFocusTrigger?: boolean;
  onAutoFocusTriggerConsumed?: () => void;
  /** Focus and select text input after open (e.g. newly added text) */
  autoFocusText?: boolean;
  onAutoFocusTextConsumed?: () => void;
};

export function TimelineItemPopover({
  item,
  setItems,
  onWantsToRemove,
  onWantsToUpdate,
  onWantsToInsertAfter,
  uniqueStudents = [],
  onTriggerKeyDown,
  autoFocusTrigger = false,
  onAutoFocusTriggerConsumed,
  autoFocusText = false,
  onAutoFocusTextConsumed,
}: TimelineItemPopoverProps) {
  const t = useTranslations();

  const handleRemove = useCallback(() => {
    onWantsToRemove(item.id);
  }, [
    onWantsToRemove,
    item.id,
  ]);

  const handleTriggerUpdate = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.value === "") {
        onWantsToUpdate(item.id, {
          trigger: undefined,
        });
        return;
      }

      onWantsToUpdate(item.id, {
        trigger: event.target.value,
      });
    },
    [
      onWantsToUpdate,
      item.id,
    ],
  );

  const selectedTargets = useMemo(() => {
    if (item.type !== "student") {
      return [];
    }

    return [
      item.target,
      ...(item.extraTargets ?? []),
    ].filter((target): target is Student => !!target);
  }, [
    item,
  ]);

  // Targets from outside the team stay visible so they can be deselected.
  const targetOptions = useMemo(
    () => [
      ...selectedTargets.filter(
        (target) => !uniqueStudents.some((student) => student.id === target.id),
      ),
      ...uniqueStudents,
    ],
    [
      selectedTargets,
      uniqueStudents,
    ],
  );

  const toggleTarget = useCallback(
    (student: Student) => {
      const isSelected = selectedTargets.some(
        (target) => target.id === student.id,
      );

      if (!isSelected && selectedTargets.length >= MAX_TIMELINE_TARGETS) {
        return;
      }

      const next = isSelected
        ? selectedTargets.filter((target) => target.id !== student.id)
        : [
            ...selectedTargets,
            student,
          ];

      // The first target is `target`; removing it promotes the next one.
      onWantsToUpdate(item.id, {
        target: next[0],
        extraTargets: next.slice(1),
      });
    },
    [
      selectedTargets,
      onWantsToUpdate,
      item.id,
    ],
  );

  const handleVariantUpdate = useCallback(
    (variantId: string) => {
      if (variantId === "default") {
        onWantsToUpdate(item.id, {
          variantId: undefined,
        });
        return;
      }
      onWantsToUpdate(item.id, {
        variantId,
      });
    },
    [
      onWantsToUpdate,
      item.id,
    ],
  );

  const handleCopyUpdate = useCallback(
    (checked: boolean) => {
      onWantsToUpdate(item.id, {
        copy: checked,
      });
    },
    [
      onWantsToUpdate,
      item.id,
    ],
  );

  const handleNotesUpdate = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (event.target.value === "") {
        onWantsToUpdate(item.id, {
          notes: undefined,
        });
        return;
      }
      onWantsToUpdate(item.id, {
        notes: event.target.value,
      });
    },
    [
      onWantsToUpdate,
      item.id,
    ],
  );

  const handleSizeUpdate = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseInt(event.target.value, 10);
      onWantsToUpdate(item.id, {
        size: Number.isNaN(value) ? undefined : value,
      });
    },
    [
      onWantsToUpdate,
      item.id,
    ],
  );

  const handleTextUpdate = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onWantsToUpdate(item.id, {
        text: event.target.value,
      });
    },
    [
      onWantsToUpdate,
      item.id,
    ],
  );

  const duplicate = useCallback(() => {
    const newItem: TimelineItem = {
      ...item,
      id: uuid(),
    };
    setItems((prev) => {
      const index = prev.findIndex((other) => other.id === item.id);

      return index === -1
        ? [
            ...prev,
            newItem,
          ]
        : prev.toSpliced(index + 1, 0, newItem);
    });
  }, [
    item,
    setItems,
  ]);

  const skillVariants = useMemo(() => {
    if (item.type !== "student") {
      return [];
    }
    const variants = skillCardVariantMap[item.student.id as SkillCardVariant];
    if (!variants) {
      return [];
    }
    return variants;
  }, [
    item,
  ]);

  useLayoutEffect(() => {
    if (item.type !== "student" || !autoFocusTrigger) {
      return;
    }
    let consumed = false;
    const finish = () => {
      if (consumed) {
        return;
      }
      consumed = true;
      onAutoFocusTriggerConsumed?.();
    };
    const tryFocus = () => {
      const el = document.getElementById(
        `pop-trigger-${item.id}`,
      ) as HTMLInputElement | null;
      if (!el) {
        return;
      }
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
  }, [
    item.id,
    item.type,
    autoFocusTrigger,
    onAutoFocusTriggerConsumed,
  ]);

  useLayoutEffect(() => {
    if (item.type !== "text" || !autoFocusText) {
      return;
    }

    let consumed = false;

    const finish = () => {
      if (consumed) {
        return;
      }

      consumed = true;
      onAutoFocusTextConsumed?.();
    };

    const tryFocus = () => {
      const el = document.getElementById(
        `pop-text-${item.id}`,
      ) as HTMLTextAreaElement | null;

      if (!el) {
        return;
      }

      el.focus();
      el.select();
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
  }, [
    item.id,
    item.type,
    autoFocusText,
    onAutoFocusTextConsumed,
  ]);

  return (
    <PopoverContent
      className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0"
      style={{
        maxHeight: "calc(var(--radix-popover-content-available-height) - 1rem)",
      }}
      onOpenAutoFocus={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => {
        if (isTimelinePreviewAnchorTarget(e.target)) {
          e.preventDefault();
        }
      }}
      onFocusOutside={(e) => {
        if (isTimelinePreviewAnchorTarget(e.target)) {
          e.preventDefault();
        }
      }}
    >
      <TooltipProvider delayDuration={300}>
        <header className="flex shrink-0 items-center gap-2 py-2 pl-3 pr-2">
          {item.type === "student" ? (
            <StudentTile student={item.student} className="size-6" />
          ) : (
            <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
              {item.type === "text" && <TypeIcon />}
              {item.type === "separator" &&
                (item.orientation === "horizontal" ? (
                  <MoveHorizontalIcon />
                ) : (
                  <CornerRightDownIcon />
                ))}
            </span>
          )}

          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {item.type === "student" && item.student.name}
            {item.type === "separator" &&
              t(`tools.timeline.editor.separator.title.${item.orientation}`)}
            {item.type === "text" && t("tools.timeline.editor.text.title")}
          </h3>

          {item.type === "student" && (
            <WithTooltip
              label={t("tools.timeline.editor.fields.copyDescription")}
            >
              <Toggle
                size="sm"
                pressed={!!item.copy}
                onPressedChange={handleCopyUpdate}
                aria-label={t("tools.timeline.editor.fields.copy")}
                className="size-7 min-w-0 p-0 text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground"
              >
                <CircleLetterCIcon />
              </Toggle>
            </WithTooltip>
          )}

          <IconAction
            label={t("tools.timeline.editor.actions.duplicate")}
            onClick={duplicate}
          >
            <CopyPlusIcon />
          </IconAction>

          <IconAction
            label={t("tools.timeline.editor.actions.remove")}
            className="hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20 dark:hover:text-red-400"
            onClick={handleRemove}
          >
            <Trash2Icon />
          </IconAction>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {item.type === "student" && (
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2">
              <Field
                label={t("tools.timeline.editor.fields.trigger")}
                htmlFor={`pop-trigger-${item.id}`}
              >
                <Input
                  id={`pop-trigger-${item.id}`}
                  className="h-8"
                  value={item.trigger ?? ""}
                  placeholder={t(
                    "tools.timeline.editor.student.trigger.placeholder",
                  )}
                  onChange={handleTriggerUpdate}
                  onKeyDown={onTriggerKeyDown}
                />
              </Field>

              {skillVariants.length > 0 && (
                <Field
                  label={t("tools.timeline.editor.fields.variant")}
                  htmlFor={`pop-variant-${item.id}`}
                >
                  <Select
                    value={item.variantId ?? "default"}
                    onValueChange={handleVariantUpdate}
                  >
                    <SelectTrigger
                      id={`pop-variant-${item.id}`}
                      className="h-8 w-full"
                    >
                      <span className="truncate">
                        {skillVariants.find((v) => v.id === item.variantId)
                          ?.name ??
                          t("tools.timeline.editor.student.variant.default")}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {skillVariants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <Field label={t("tools.timeline.editor.fields.targets")}>
                <div className="flex items-center gap-1">
                  <TimelineItemTargetPicker
                    uniqueStudents={targetOptions}
                    selectedIds={selectedTargets.map((target) => target.id)}
                    onToggle={toggleTarget}
                  />

                  <StudentPicker
                    onStudentSelected={toggleTarget}
                    className="w-full z-[60]"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label={t("tools.timeline.editor.student.target.add")}
                      title={t("tools.timeline.editor.student.target.add")}
                      disabled={selectedTargets.length >= MAX_TIMELINE_TARGETS}
                    >
                      <PlusIcon />
                    </Button>
                  </StudentPicker>
                </div>
              </Field>

              <Field
                label={t("tools.timeline.editor.fields.notes")}
                htmlFor={`pop-notes-${item.id}`}
              >
                <Textarea
                  id={`pop-notes-${item.id}`}
                  rows={1}
                  value={item.notes ?? ""}
                  placeholder={t(
                    "tools.timeline.editor.student.notes.placeholder",
                  )}
                  onChange={handleNotesUpdate}
                  className="max-h-24 min-h-8 resize-none px-3 py-1.5"
                />
              </Field>
            </div>
          )}

          {item.type === "separator" && (
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
              <Field
                label={t("tools.timeline.editor.fields.size")}
                htmlFor={`pop-size-${item.id}`}
              >
                <Input
                  id={`pop-size-${item.id}`}
                  type="number"
                  className="h-8"
                  value={item.size ?? ""}
                  placeholder={t(
                    "tools.timeline.editor.separator.size.placeholder",
                  )}
                  onChange={handleSizeUpdate}
                />
              </Field>
            </div>
          )}

          {item.type === "text" && (
            <Textarea
              id={`pop-text-${item.id}`}
              aria-label={t("tools.timeline.editor.text.title")}
              value={item.text}
              placeholder={t("tools.timeline.editor.text.placeholder")}
              onChange={handleTextUpdate}
              className="max-h-40 min-h-16 resize-none px-3 py-1.5"
            />
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t py-1 pl-3 pr-2">
          <span className="text-xs text-muted-foreground">
            {t("tools.timeline.editor.insert.title")}
          </span>

          <div className="flex items-center gap-0.5">
            <IconAction
              label={t("tools.timeline.editor.actions.insertHS")}
              onClick={() => onWantsToInsertAfter(item.id, "horizontal")}
            >
              <MoveHorizontalIcon />
            </IconAction>
            <IconAction
              label={t("tools.timeline.editor.actions.insertVS")}
              onClick={() => onWantsToInsertAfter(item.id, "vertical")}
            >
              <CornerRightDownIcon />
            </IconAction>
            <IconAction
              label={t("tools.timeline.editor.actions.insertText")}
              onClick={() => onWantsToInsertAfter(item.id, "text")}
            >
              <TypeIcon />
            </IconAction>
          </div>
        </footer>
      </TooltipProvider>
    </PopoverContent>
  );
}
