"use client";

import { TimelineItemTargetPicker } from "@/app/timeline-visualizer/_components/timeline-item-target-picker";
import type { TimelineItem as TimelineItemType } from "@/app/timeline-visualizer/_components/timeline-preview";
import { TimelineQuickAdd } from "@/app/timeline-visualizer/_components/timeline-quick-add";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type SkillCardVariant, skillCardVariantMap } from "@/lib/skill-card";
import { buildStudentIconUrl } from "@/lib/url";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Student } from "~prisma";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  CopyIcon,
  GripVerticalIcon,
  XIcon,
} from "lucide-react";
import {
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import { useTranslations } from "next-intl";

export type TimelineItemProps = {
  item: TimelineItemType;
  setItems: React.Dispatch<SetStateAction<TimelineItemType[]>>;
  onWantsToRemove(itemId: string): void;
  onWantsToUpdate(
    itemId: string,
    data: Omit<TimelineItemType, "type" | "student" | "id">,
  ): void;
  onWantsToAddBelow?(belowId: string, item: TimelineItemType): void;
  allStudents?: Student[];
  uniqueStudents?: Student[];
  highlighted?: boolean;
  onTriggerKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocusOnTriggerField?: boolean;
};

export function TimelineItem({
  item,
  setItems,
  onWantsToRemove,
  onWantsToUpdate,
  onWantsToAddBelow,
  uniqueStudents = [],
  highlighted = false,
  onTriggerKeyDown,
  autoFocusOnTriggerField = false,
}: TimelineItemProps) {
  const t = useTranslations();

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id, animateLayoutChanges: () => false });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [separatorOverride, setSeparatorOverride] = useState(
    item.type === "separator" && typeof item.size === "number",
  );
  const [separatorSizeStr, setSeparatorSizeStr] = useState<string | undefined>(
    item.type === "separator" ? item.size?.toString() : undefined,
  );

  const [displayNotesField, setDisplayNotesField] = useState(
    item.type === "student" && !!item.notes,
  );

  const handleRemove = useCallback(() => {
    onWantsToRemove(item.id);
  }, [onWantsToRemove]);

  const handleTriggerUpdate = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.value === "") {
        onWantsToUpdate(item.id, { trigger: undefined });
        return;
      }

      onWantsToUpdate(item.id, { trigger: event.target.value });
    },
    [onWantsToUpdate],
  );

  const handleTargetUpdate = useCallback(
    (student: Student | null) => {
      if (item.type !== "student") {
        return;
      }

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
    [onWantsToUpdate],
  );

  const handleCopyUpdate = useCallback(
    (checked: boolean) => {
      onWantsToUpdate(item.id, { copy: checked });
    },
    [onWantsToUpdate],
  );

  const handleNotesUpdate = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (event.target.value === "") {
        onWantsToUpdate(item.id, { notes: undefined });
        return;
      }

      onWantsToUpdate(item.id, { notes: event.target.value });
    },
    [onWantsToUpdate],
  );

  const handleTextUpdate = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onWantsToUpdate(item.id, { text: event.target.value });
    },
    [onWantsToUpdate],
  );

  const insertStudentBelow = useCallback(
    (student: Student) => {
      return onWantsToAddBelow?.(item.id, {
        type: "student",
        id: uuid(),
        student,
      });
    },
    [onWantsToAddBelow],
  );

  const insertSeparatorBelow = useCallback(
    (orientation: "horizontal" | "vertical") => {
      return onWantsToAddBelow?.(item.id, {
        type: "separator",
        id: uuid(),
        orientation,
      });
    },
    [onWantsToAddBelow],
  );

  const insertTextBelow = useCallback(() => {
    return onWantsToAddBelow?.(item.id, {
      type: "text",
      id: uuid(),
      text: "Enter text",
    });
  }, [onWantsToAddBelow]);

  const duplicate = useCallback(() => {
    const newItem: TimelineItemType = {
      ...item,
      id: uuid(),
    };

    setItems((prev) => [...prev, newItem]);
  }, [item, setItems]);

  const skillVariants = useMemo(() => {
    if (item.type !== "student") {
      return [];
    }

    const variants = skillCardVariantMap[item.student.id as SkillCardVariant];
    if (!variants) {
      return [];
    }

    return variants;
  }, [item]);

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
    if (item.type !== "separator" || !separatorOverride) {
      return;
    }

    const value = Number.parseInt(separatorSizeStr ?? "", 10);
    if (!Number.isNaN(value)) {
      onWantsToUpdate(item.id, { size: value });
    }
  }, [separatorSizeStr]);

  return (
    <article
      ref={setNodeRef}
      className="bg-background relative border rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 group mb-5"
      style={style}
      id={item.id}
      {...attributes}
    >
      {highlighted && (
        <div className="absolute inset-0 border-2 bg-yellow-300 opacity-20 rounded-md pointer-events-none" />
      )}

      <div className="relative flex md:items-center gap-4 flex-1">
        <Button className="cursor-move" variant="ghost" {...listeners}>
          <GripVerticalIcon />
        </Button>

        <div className="flex-1 flex md:items-center gap-4">
          {item.type === "student" && (
            <>
              <img
                src={buildStudentIconUrl(item.student)}
                alt={item.student.name}
                className="h-14"
              />

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="text-xl font-bold">{item.student.name}</div>

                  {skillVariants.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`variant-${item.id}`}>
                        {t("tools.timeline.editor.student.variant.label")}
                      </Label>

                      <Select
                        value={item.variantId ?? "default"}
                        onValueChange={handleVariantUpdate}
                      >
                        <SelectTrigger>
                          {skillVariants.find((v) => v.id === item.variantId)
                            ?.name ??
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
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`trigger-${item.id}`}>
                      {t("tools.timeline.editor.student.trigger.label")}
                    </Label>

                    <Input
                      id={`trigger-${item.id}`}
                      value={item.trigger ?? ""}
                      placeholder={t(
                        "tools.timeline.editor.student.trigger.placeholder",
                      )}
                      onChange={handleTriggerUpdate}
                      onKeyDown={onTriggerKeyDown}
                      className="w-32"
                      autoFocus={autoFocusOnTriggerField}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor={`target-${item.id}`}>
                      {t("tools.timeline.editor.student.target.label")}
                    </Label>

                    <StudentPicker
                      onStudentSelected={handleTargetUpdate}
                      className="w-[90vw] md:w-[450px]"
                    >
                      <Button
                        variant="outline"
                        className="w-[220px] justify-between"
                      >
                        {item.target
                          ? `${item.target.name}`
                          : t("tools.timeline.editor.student.target.select")}
                        <ChevronsUpDownIcon />
                      </Button>
                    </StudentPicker>

                    {uniqueStudents.length > 0 && (
                      <TimelineItemTargetPicker
                        student={item.student}
                        uniqueStudents={uniqueStudents}
                        currentTarget={item.target}
                        onToggle={handleTargetUpdate}
                      />
                    )}

                    {item.target && (
                      <Button
                        variant="outline"
                        onClick={() => handleTargetUpdate(null)}
                      >
                        <XIcon />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`copy-${item.id}`}
                      checked={!!item.copy}
                      onCheckedChange={handleCopyUpdate}
                    />

                    <Label htmlFor={`copy-${item.id}`}>
                      {t("tools.timeline.editor.student.copy.label")}
                    </Label>
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      onClick={() => setDisplayNotesField((prev) => !prev)}
                    >
                      {displayNotesField && <ChevronUpIcon />}
                      {!displayNotesField && <ChevronDownIcon />}
                      {t("tools.timeline.editor.student.notes.toggle")}
                    </Button>
                  </div>
                </div>

                {displayNotesField && (
                  <div className="flex items-start gap-2">
                    <Label htmlFor={`notes-${item.id}`} className="mt-1">
                      {t("tools.timeline.editor.student.notes.label")}
                    </Label>

                    <Textarea
                      id={`notes-${item.id}`}
                      value={item.notes ?? ""}
                      placeholder={t(
                        "tools.timeline.editor.student.notes.placeholder",
                      )}
                      onChange={handleNotesUpdate}
                      className="w-full resize-none"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {item.type === "separator" && (
            <>
              <div className="text-center text-xl text-muted-foreground">
                {t(`tools.timeline.editor.separator.title.${item.orientation}`)}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id={`sizeOverride-${item.id}`}
                  checked={separatorOverride}
                  onCheckedChange={(checked) => setSeparatorOverride(checked)}
                />

                <Label htmlFor={`sizeOverride-${item.id}`}>
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
                  className="w-32"
                />
              )}
            </>
          )}

          {item.type === "text" && (
            <div className="flex-1">
              <Textarea
                value={item.text}
                placeholder={t("tools.timeline.editor.text.placeholder")}
                onChange={handleTextUpdate}
                className="w-full resize-none"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Button
            variant="outline"
            onClick={duplicate}
            title={t("tools.timeline.editor.actions.duplicate")}
          >
            <CopyIcon />
          </Button>

          <Button variant="destructive" onClick={handleRemove}>
            {t("tools.timeline.editor.actions.remove")}
          </Button>
        </div>
      </div>

      <div className="hidden group-hover:flex items-center gap-2 absolute -bottom-6 right-4 border rounded-md shadow-md bg-background py-1 px-3 text-xs z-50">
        <strong>{t("tools.timeline.editor.actions.addHere")}</strong>

        <TimelineQuickAdd
          students={uniqueStudents}
          onStudentClick={insertStudentBelow}
          small
        />

        <button
          type="button"
          className="skew-x-[-11deg] rounded-[11%] w-[30px] h-[26px] hover:bg-secondary border flex items-center justify-center cursor-pointer"
          onClick={() => insertSeparatorBelow("horizontal")}
          title={t("tools.timeline.editor.actions.insertHS")}
        >
          <div className="skew-x-[11deg] text-xs font-bold">HS</div>
        </button>

        <button
          type="button"
          className="skew-x-[-11deg] rounded-[11%] w-[30px] h-[26px] hover:bg-secondary border flex items-center justify-center cursor-pointer"
          onClick={() => insertSeparatorBelow("vertical")}
          title={t("tools.timeline.editor.actions.insertVS")}
        >
          <div className="skew-x-[11deg] text-xs font-bold">VS</div>
        </button>

        <button
          type="button"
          className="skew-x-[-11deg] rounded-[11%] w-[30px] h-[26px] hover:bg-secondary border flex items-center justify-center cursor-pointer"
          onClick={insertTextBelow}
          title={t("tools.timeline.editor.actions.insertText")}
        >
          <div className="skew-x-[11deg] text-xs font-bold">T</div>
        </button>
      </div>
    </article>
  );
}
