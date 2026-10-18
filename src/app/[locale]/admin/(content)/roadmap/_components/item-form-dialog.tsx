"use client";

import { StudentPicker } from "@/components/common/student-picker";
import { useRoadmapLabels } from "@/components/roadmap/use-roadmap-labels";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useStudents } from "@/hooks/use-students";
import {
  ATTACK_TYPES,
  BONUS_CAMPAIGN_TYPES,
  DAY_MS,
  DEFENSE_TYPES,
  EVENT_RUN_TYPES,
  MULTI_FLOOR_RAID_BOSSES,
  PERMANENT_END_DATE,
  RAID_BOSSES,
  RAID_TYPES,
  SCENARIO_TYPES,
  TERRAINS,
  TIME_ATTACK_DUNGEON_TYPES,
  WORLD_RAID_BOSSES,
  isPermanent,
} from "@/lib/roadmap/constants";
import {
  type AnyRoadmapInput,
  type RoadmapInput,
  roadmapInputSchemas,
} from "@/lib/roadmap/schemas";
import type { EditableRoadmapKind, RoadmapRaidRoom } from "@/lib/roadmap/types";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useState } from "react";
import { toast } from "sonner";

export type ItemFormState = {
  mode: "create" | "edit";
  kind: EditableRoadmapKind;
  input: AnyRoadmapInput;
  eventStudentName?: string | null;
};

export type ItemFormDialogProps = {
  state: ItemFormState | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AnyRoadmapInput) => Promise<boolean>;
};

const NONE = "__none__";

function toInputValue(iso: string) {
  return iso.slice(0, 19);
}

function fromInputValue(value: string) {
  const date = new Date(`${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const MINUTE_MS = 60 * 1000;

function endFromDuration(startDate: string, days: number) {
  return new Date(
    new Date(startDate).getTime() + days * DAY_MS - MINUTE_MS,
  ).toISOString();
}

function durationFromDates(startDate: string, endDate: string) {
  const days =
    (new Date(endDate).getTime() + MINUTE_MS - new Date(startDate).getTime()) /
    DAY_MS;
  return String(Math.round(days * 100) / 100);
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function EnumSelect<T extends string>({
  value,
  options,
  onChange,
  getLabel,
  nullable,
  noneLabel,
}: {
  value: T | null;
  options: readonly T[];
  onChange: (value: T | null) => void;
  getLabel: (value: T) => string;
  nullable?: boolean;
  noneLabel?: string;
}) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) => onChange(next === NONE ? null : (next as T))}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        {nullable && <SelectItem value={NONE}>{noneLabel}</SelectItem>}

        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {getLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MultiToggle<T extends string>({
  value,
  options,
  onChange,
  getLabel,
}: {
  value: T[];
  options: readonly T[];
  onChange: (value: T[]) => void;
  getLabel: (value: T) => string;
}) {
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(next) => onChange(next as T[])}
      className="flex-wrap w-full"
    >
      {options.map((option) => (
        <ToggleGroupItem key={option} value={option} className="px-2 text-xs">
          {getLabel(option)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function ItemFormDialog({
  state,
  onOpenChange,
  onSubmit,
}: ItemFormDialogProps) {
  const t = useTranslations();
  const labels = useRoadmapLabels();
  const { studentMap } = useStudents();
  const id = useId();

  const [input, setInput] = useState<AnyRoadmapInput | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [durationDraft, setDurationDraft] = useState<string | null>(null);

  useEffect(() => {
    setInput(state?.input ?? null);
    setDurationDraft(null);
  }, [state]);

  if (!state || !input) {
    return null;
  }

  const { kind } = state;
  const update = (patch: object) =>
    setInput((prev) =>
      prev ? ({ ...prev, ...patch } as AnyRoadmapInput) : prev,
    );

  const permanent = isPermanent(input.startDate, input.endDate);
  const category = labels.category(kind);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = roadmapInputSchemas[kind].safeParse(input);

    if (!parsed.success) {
      toast.error(
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("\n"),
      );

      return;
    }

    if (new Date(input.endDate) <= new Date(input.startDate)) {
      toast.error("endDate must be after startDate");
      return;
    }

    setSubmitting(true);
    const ok = await onSubmit(parsed.data as AnyRoadmapInput);
    setSubmitting(false);

    if (ok) {
      onOpenChange(false);
    }
  };

  const raid =
    kind === "raid" || kind === "frr" ? (input as RoadmapInput<"raid">) : null;
  const event = kind === "event" ? (input as RoadmapInput<"event">) : null;
  const story = kind === "story" ? (input as RoadmapInput<"story">) : null;
  const bonus = kind === "bonus" ? (input as RoadmapInput<"bonus">) : null;
  const named =
    kind === "workLog" || kind === "battlePass"
      ? (input as RoadmapInput<"workLog">)
      : null;
  const etc = kind === "etc" ? (input as RoadmapInput<"etc">) : null;

  const eventStudentName = event?.eventStudentId
    ? (studentMap[event.eventStudentId]?.name ?? state.eventStudentName)
    : null;

  const setRoom = (index: number, patch: Partial<RoadmapRaidRoom>) => {
    if (!raid) {
      return;
    }

    update({
      rooms: raid.rooms.map((room, idx) =>
        idx === index ? { ...room, ...patch } : room,
      ),
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {state.mode === "create"
                ? t("tools.admin.roadmap.form.createTitle", { category })
                : t("tools.admin.roadmap.form.editTitle", { category })}
            </DialogTitle>

            <DialogDescription>
              {labels.t("static.roadmap.utc")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label={t("tools.admin.roadmap.form.startDate")}
              htmlFor={`${id}-start`}
            >
              <Input
                id={`${id}-start`}
                type="datetime-local"
                step={1}
                value={toInputValue(input.startDate)}
                onChange={(e) => {
                  const startDate = fromInputValue(e.target.value);
                  if (startDate) {
                    update({ startDate });
                  }
                }}
              />
            </Field>

            <Field
              label={t("tools.admin.roadmap.form.endDate")}
              htmlFor={`${id}-end`}
            >
              <Input
                id={`${id}-end`}
                type="datetime-local"
                step={1}
                disabled={permanent}
                value={permanent ? "" : toInputValue(input.endDate)}
                onChange={(e) => {
                  const endDate = fromInputValue(e.target.value);
                  if (endDate) {
                    update({ endDate });
                  }
                }}
              />
            </Field>

            <Field
              label={t("tools.admin.roadmap.form.duration")}
              htmlFor={`${id}-duration`}
            >
              <Input
                id={`${id}-duration`}
                type="number"
                min={0}
                step="any"
                disabled={permanent}
                value={
                  permanent
                    ? ""
                    : (durationDraft ??
                      durationFromDates(input.startDate, input.endDate))
                }
                onFocus={(e) => setDurationDraft(e.target.value)}
                onBlur={() => setDurationDraft(null)}
                onChange={(e) => {
                  setDurationDraft(e.target.value);
                  const days = Number(e.target.value);
                  if (e.target.value !== "" && days > 0) {
                    update({ endDate: endFromDuration(input.startDate, days) });
                  }
                }}
              />
            </Field>

            <div className="flex items-center gap-2 sm:pt-6">
              <Checkbox
                id={`${id}-permanent`}
                checked={permanent}
                onCheckedChange={(checked) =>
                  update({
                    endDate: checked
                      ? PERMANENT_END_DATE
                      : endFromDuration(input.startDate, 7),
                  })
                }
              />

              <Label htmlFor={`${id}-permanent`}>
                {t("tools.admin.roadmap.form.permanent")}
              </Label>
            </div>
          </div>

          {raid && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {kind === "raid" && (
                  <Field label={t("tools.admin.roadmap.form.type")}>
                    <EnumSelect
                      value={raid.type}
                      options={RAID_TYPES.filter(
                        (type) => type !== "MultiFloorRaid",
                      )}
                      onChange={(type) => type && update({ type })}
                      getLabel={(type) =>
                        labels.t(`static.roadmap.raidTypes.${type}`)
                      }
                    />
                  </Field>
                )}

                {(raid.type === "Raid" || raid.type === "EliminateRaid") && (
                  <Field label={t("tools.admin.roadmap.form.boss")}>
                    <EnumSelect
                      value={raid.raidBoss}
                      options={RAID_BOSSES}
                      nullable
                      noneLabel={t("tools.admin.roadmap.form.none")}
                      onChange={(raidBoss) => update({ raidBoss })}
                      getLabel={(boss) =>
                        labels.t(
                          `common.raids.${boss.toLowerCase() as Lowercase<typeof boss>}`,
                        )
                      }
                    />
                  </Field>
                )}

                {raid.type === "MultiFloorRaid" && (
                  <Field label={t("tools.admin.roadmap.form.boss")}>
                    <EnumSelect
                      value={raid.multiFloorRaidBoss}
                      options={MULTI_FLOOR_RAID_BOSSES}
                      nullable
                      noneLabel={t("tools.admin.roadmap.form.none")}
                      onChange={(multiFloorRaidBoss) =>
                        update({ multiFloorRaidBoss })
                      }
                      getLabel={(boss) =>
                        labels.t(`static.roadmap.multiFloorRaidBosses.${boss}`)
                      }
                    />
                  </Field>
                )}

                {raid.type === "WorldRaid" && (
                  <Field label={t("tools.admin.roadmap.form.boss")}>
                    <EnumSelect
                      value={raid.worldRaidBoss}
                      options={WORLD_RAID_BOSSES}
                      nullable
                      noneLabel={t("tools.admin.roadmap.form.none")}
                      onChange={(worldRaidBoss) => update({ worldRaidBoss })}
                      getLabel={(boss) =>
                        labels.t(`static.roadmap.worldRaidBosses.${boss}`)
                      }
                    />
                  </Field>
                )}

                {raid.type === "TimeAttackDungeon" && (
                  <Field label={t("tools.admin.roadmap.form.drillType")}>
                    <EnumSelect
                      value={raid.timeAttackDungeonType}
                      options={TIME_ATTACK_DUNGEON_TYPES}
                      nullable
                      noneLabel={t("tools.admin.roadmap.form.none")}
                      onChange={(timeAttackDungeonType) =>
                        update({ timeAttackDungeonType })
                      }
                      getLabel={(type) =>
                        labels.t(
                          `static.roadmap.timeAttackDungeonTypes.${type}`,
                        )
                      }
                    />
                  </Field>
                )}
              </div>

              <Field label={t("tools.admin.roadmap.form.attackTypes")}>
                <MultiToggle
                  value={raid.attackTypes}
                  options={ATTACK_TYPES}
                  onChange={(attackTypes) => update({ attackTypes })}
                  getLabel={(type) => labels.t(`common.attackType.${type}`)}
                />
              </Field>

              <Field label={t("tools.admin.roadmap.form.defenseTypes")}>
                <MultiToggle
                  value={raid.defenseTypes}
                  options={DEFENSE_TYPES}
                  onChange={(defenseTypes) => update({ defenseTypes })}
                  getLabel={(type) => labels.t(`common.defenseType.${type}`)}
                />
              </Field>

              <Field label={t("tools.admin.roadmap.form.terrains")}>
                <MultiToggle
                  value={raid.terrains}
                  options={TERRAINS}
                  onChange={(terrains) => update({ terrains })}
                  getLabel={(terrain) => labels.t(`common.terrain.${terrain}`)}
                />
              </Field>

              {raid.type === "EliminateRaid" && (
                <div className="flex flex-col gap-2">
                  <Label>{t("tools.admin.roadmap.form.rooms")}</Label>

                  {raid.rooms.map((room, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {labels.t("static.roadmap.room", { index: idx + 1 })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            update({
                              rooms: raid.rooms.filter((_, i) => i !== idx),
                            })
                          }
                        >
                          <Trash2Icon />
                          {t("tools.admin.roadmap.form.removeRoom")}
                        </Button>
                      </div>

                      <MultiToggle
                        value={room.defenseTypes}
                        options={DEFENSE_TYPES}
                        onChange={(defenseTypes) =>
                          setRoom(idx, { defenseTypes })
                        }
                        getLabel={(type) =>
                          labels.t(`common.defenseType.${type}`)
                        }
                      />
                      <MultiToggle
                        value={room.attackTypes}
                        options={ATTACK_TYPES}
                        onChange={(attackTypes) =>
                          setRoom(idx, { attackTypes })
                        }
                        getLabel={(type) =>
                          labels.t(`common.attackType.${type}`)
                        }
                      />
                      <MultiToggle
                        value={room.terrains}
                        options={TERRAINS}
                        onChange={(terrains) => setRoom(idx, { terrains })}
                        getLabel={(terrain) =>
                          labels.t(`common.terrain.${terrain}`)
                        }
                      />

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${id}-room-${idx}-torment`}
                            checked={room.hasTorment}
                            onCheckedChange={(checked) =>
                              setRoom(idx, { hasTorment: !!checked })
                            }
                          />
                          <Label htmlFor={`${id}-room-${idx}-torment`}>
                            {t("tools.admin.roadmap.form.torment")}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${id}-room-${idx}-lunatic`}
                            checked={room.hasLunatic}
                            onCheckedChange={(checked) =>
                              setRoom(idx, { hasLunatic: !!checked })
                            }
                          />
                          <Label htmlFor={`${id}-room-${idx}-lunatic`}>
                            {t("tools.admin.roadmap.form.lunatic")}
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}

                  {raid.rooms.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={() =>
                        update({
                          rooms: [
                            ...raid.rooms,
                            {
                              attackTypes: [],
                              defenseTypes: [],
                              terrains: raid.terrains,
                              hasTorment: true,
                              hasLunatic: false,
                            },
                          ],
                        })
                      }
                    >
                      <PlusIcon />
                      {t("tools.admin.roadmap.form.addRoom")}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {(event || story) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label={t("tools.admin.roadmap.form.name")}
                htmlFor={`${id}-name`}
              >
                <Input
                  id={`${id}-name`}
                  value={(event ?? story)?.name ?? ""}
                  onChange={(e) => update({ name: e.target.value })}
                  required
                />
              </Field>

              <Field
                label={t("tools.admin.roadmap.form.internalId")}
                htmlFor={`${id}-internal-id`}
              >
                <Input
                  id={`${id}-internal-id`}
                  value={(event ?? story)?.internalId ?? ""}
                  onChange={(e) => update({ internalId: e.target.value })}
                />
              </Field>

              {event && (
                <Field label={t("tools.admin.roadmap.form.type")}>
                  <EnumSelect
                    value={event.type}
                    options={EVENT_RUN_TYPES}
                    onChange={(type) => type && update({ type })}
                    getLabel={(type) =>
                      labels.t(`static.roadmap.eventTypes.${type}`)
                    }
                  />
                </Field>
              )}

              {event && (
                <Field label={t("tools.admin.roadmap.form.eventStudent")}>
                  <div className="flex items-center gap-2">
                    <StudentPicker
                      onStudentSelected={(student) =>
                        update({ eventStudentId: student.id })
                      }
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 justify-start"
                      >
                        {eventStudentName ??
                          t("tools.admin.roadmap.form.selectStudent")}
                      </Button>
                    </StudentPicker>
                    {event.eventStudentId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("tools.admin.roadmap.form.clearStudent")}
                        onClick={() => update({ eventStudentId: null })}
                      >
                        <XIcon />
                      </Button>
                    )}
                  </div>
                </Field>
              )}

              {story && (
                <Field label={t("tools.admin.roadmap.form.type")}>
                  <EnumSelect
                    value={story.type}
                    options={SCENARIO_TYPES}
                    onChange={(type) => type && update({ type })}
                    getLabel={(type) =>
                      labels.t(`static.roadmap.scenarioTypes.${type}`)
                    }
                  />
                </Field>
              )}

              {story && (
                <Field
                  label={t("tools.admin.roadmap.form.episodeCount")}
                  htmlFor={`${id}-episodes`}
                >
                  <Input
                    id={`${id}-episodes`}
                    type="number"
                    min={0}
                    value={story.episodeCount}
                    onChange={(e) =>
                      update({ episodeCount: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
              )}
            </div>
          )}

          {bonus && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("tools.admin.roadmap.form.type")}>
                <EnumSelect
                  value={bonus.type}
                  options={BONUS_CAMPAIGN_TYPES}
                  onChange={(type) => type && update({ type })}
                  getLabel={(type) =>
                    labels.t(`static.roadmap.bonusTypes.${type}`)
                  }
                />
              </Field>
              <Field
                label={t("tools.admin.roadmap.form.multiplier")}
                htmlFor={`${id}-multiplier`}
              >
                <Input
                  id={`${id}-multiplier`}
                  type="number"
                  min={1}
                  value={bonus.bonusMultiply}
                  onChange={(e) =>
                    update({ bonusMultiply: Number(e.target.value) || 1 })
                  }
                />
              </Field>
            </div>
          )}

          {named && (
            <Field
              label={t("tools.admin.roadmap.form.name")}
              htmlFor={`${id}-name`}
            >
              <Input
                id={`${id}-name`}
                value={named.name}
                onChange={(e) => update({ name: e.target.value })}
                required
              />
            </Field>
          )}

          {etc && (
            <>
              <Field
                label={t("tools.admin.roadmap.form.label")}
                htmlFor={`${id}-label`}
              >
                <Input
                  id={`${id}-label`}
                  value={etc.label}
                  onChange={(e) => update({ label: e.target.value })}
                  required
                />
              </Field>
              <Field
                label={t("tools.admin.roadmap.form.description")}
                htmlFor={`${id}-description`}
              >
                <Textarea
                  id={`${id}-description`}
                  value={etc.description ?? ""}
                  onChange={(e) =>
                    update({ description: e.target.value || null })
                  }
                  rows={4}
                />
              </Field>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {state.mode === "create"
                ? t("tools.admin.roadmap.form.create")
                : t("tools.admin.roadmap.form.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
