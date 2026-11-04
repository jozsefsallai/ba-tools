"use client";

import { CalendarIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { RaidBossPicker } from "@/components/raid/raid-boss-picker";
import {
  formatRaidDate,
  formatRaidDates,
} from "@/components/raid/raid-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COMMON_DEFENSE_TYPES,
  getRaidDefenseOptions,
  getRaidTerrainOptions,
  getRoadmapRaidBoss,
  MAX_RAID_FLOOR,
  MIN_RAID_FLOOR,
  RAID_DIFFICULTIES,
  RAID_TYPES,
  type RaidInfo,
  type RaidInfoDifficulty,
  type RaidInfoScope,
  raidFromRoadmapItem,
  resolveGroupRaid,
  sanitizeRaid,
  supportsDifficulty,
  supportsFloor,
  TERRAINS,
} from "@/lib/raid-info";
import { DEFENSE_COLORS, getRaidBossLabel } from "@/lib/raid-labels";
import { getRaidArt } from "@/lib/roadmap/raid-images";
import type { RoadmapRaidItem } from "@/lib/roadmap/types";
import { TERRAIN_ICONS } from "@/lib/terrain";
import { cn } from "@/lib/utils";
import type { DefenseType, RaidType, Terrain } from "~prisma";

const RECOMMENDED_COUNT = 6;

export type RaidDetailsFormProps = {
  scope: RaidInfoScope;
  value: RaidInfo | undefined;
  onChange: (value: RaidInfo | undefined) => void;
  roadmapRaids: RoadmapRaidItem[];
  inferred?: RaidInfo;
};

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label className="text-muted-foreground">{label}</Label>
        {action}
      </div>
      {children}
    </div>
  );
}

function Choice({
  selected,
  hinted,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  hinted?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-center text-sm font-medium transition-colors hover:bg-accent",
        selected &&
          "border-primary bg-primary/10 text-foreground hover:bg-primary/15",
        hinted && !selected && "border-dashed border-primary/60 bg-primary/5",
        className,
      )}
    >
      {children}
    </button>
  );
}

function AutoHint() {
  const t = useTranslations();

  return (
    <span className="rounded-sm bg-primary/15 px-1 text-[10px] leading-4 font-semibold text-primary">
      {t("tools.raidDetails.auto")}
    </span>
  );
}

function RoadmapRaidCard({
  item,
  onClick,
  now,
}: {
  item: RoadmapRaidItem;
  onClick: () => void;
  now: number;
}) {
  const t = useTranslations();
  const locale = useLocale();

  const boss = getRoadmapRaidBoss(item);
  const art = getRaidArt(item.type, boss);
  const isOngoing = new Date(item.startDate).getTime() <= now;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-24 cursor-pointer flex-col justify-between gap-2 overflow-hidden rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/60"
    >
      {art && (
        <img
          src={art.image.src}
          alt=""
          draggable={false}
          loading="lazy"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-3/5 object-cover opacity-50 transition-opacity [mask-image:linear-gradient(to_right,transparent,black_70%)] group-hover:opacity-80"
        />
      )}

      <div className="relative min-w-0">
        <div className="truncate font-semibold">
          {getRaidBossLabel(t, item.type, boss) ??
            t("static.roadmap.unknownBoss")}
        </div>

        <div className="truncate text-xs text-muted-foreground">
          {t(`static.roadmap.raidTypes.${item.type}`)}
        </div>
      </div>

      <div className="relative flex min-w-0 flex-col gap-1 text-xs">
        {isOngoing ? (
          <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-current"
            />

            <span className="truncate">
              {t("tools.raidDetails.ongoingUntil", {
                date: formatRaidDate(item.endDate, locale),
              })}
            </span>
          </div>
        ) : (
          <div className="truncate text-muted-foreground">
            {formatRaidDates(item, locale)}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {getRaidDefenseOptions(item).map((type) => (
            <span key={type} className="flex items-center gap-1 font-medium">
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  DEFENSE_COLORS[type] ?? "bg-slate-500",
                )}
              />
              {t(`common.defenseType.${type}`)}
            </span>
          ))}

          {getRaidTerrainOptions(item).map((terrain) => (
            <span key={terrain} className="flex items-center gap-1 font-medium">
              <img
                src={TERRAIN_ICONS[terrain].src}
                alt=""
                draggable={false}
                className="size-3.5 rounded-[3px]"
              />
              {t(`common.terrain.${terrain}`)}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

export function RaidDetailsForm({
  scope,
  value,
  onChange,
  roadmapRaids,
  inferred,
}: RaidDetailsFormProps) {
  const t = useTranslations();

  const locale = useLocale();

  const [now] = useState(() => Date.now());
  const [showAllRaids, setShowAllRaids] = useState(false);

  const resolved = useMemo(
    () => (scope === "group" ? resolveGroupRaid(value, inferred) : value),
    [
      scope,
      value,
      inferred,
    ],
  );

  const type = resolved?.type;
  const season = value?.season ?? resolved?.season;
  const selectedSeason = season?.id;

  const raids = useMemo(
    () =>
      roadmapRaids
        .filter((item) => new Date(item.endDate).getTime() > now)
        .toSorted(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
    [
      roadmapRaids,
      now,
    ],
  );

  const linkedRaid = selectedSeason
    ? roadmapRaids.find((item) => item.id === selectedSeason)
    : undefined;
  const linkedDefenseTypes = linkedRaid
    ? getRaidDefenseOptions(linkedRaid)
    : [];
  const linkedTerrains = linkedRaid ? getRaidTerrainOptions(linkedRaid) : [];

  const base: RaidInfo | undefined =
    value ??
    (resolved
      ? {
          type: resolved.type,
        }
      : undefined);

  function update(patch: Partial<RaidInfo>) {
    if (!base) {
      return;
    }

    onChange(
      sanitizeRaid(
        {
          ...base,
          ...patch,
        },
        scope,
      ),
    );
  }

  function selectType(next: RaidType) {
    if (value?.type === next) {
      onChange(undefined);
      return;
    }

    onChange({
      type: next,
    });
  }

  function selectRaid(item: RoadmapRaidItem) {
    setShowAllRaids(false);
    onChange(raidFromRoadmapItem(item, scope));
  }

  function selectBoss(boss: string | undefined) {
    update({
      boss,
      season: undefined,
    });
  }

  function toggled<T>(list: T[] | undefined, item: T) {
    return list?.includes(item)
      ? list.filter((value) => value !== item)
      : [
          ...(list ?? []),
          item,
        ];
  }

  function keptSeason(
    chosen: string[],
    linkedOptions: string[],
  ): RaidInfo["season"] {
    return !linkedRaid || chosen.every((item) => linkedOptions.includes(item))
      ? base?.season
      : undefined;
  }

  function selectDefense(defenseType: DefenseType) {
    const defenseTypes = toggled(value?.defenseTypes, defenseType);

    update({
      defenseTypes,
      season: keptSeason(defenseTypes, linkedDefenseTypes),
    });
  }

  function selectTerrain(terrain: Terrain) {
    const terrains = toggled(value?.terrains, terrain);

    update({
      terrains,
      season: keptSeason(terrains, linkedTerrains),
    });
  }

  function selectDifficulty(difficulty: RaidInfoDifficulty) {
    update({
      difficulty: value?.difficulty === difficulty ? undefined : difficulty,
    });
  }

  const defenseOptions = useMemo(
    () =>
      Array.from(
        new Set<DefenseType>([
          ...COMMON_DEFENSE_TYPES,
          ...linkedDefenseTypes,
          ...(value?.defenseTypes ?? []),
        ]),
      ),
    [
      linkedDefenseTypes,
      value?.defenseTypes,
    ],
  );

  const hasBossHint = !value?.boss && !!resolved?.boss;

  const defenseHints = value?.defenseTypes
    ? []
    : (resolved?.defenseTypes ?? []);

  const terrainHints = value?.terrains ? [] : (resolved?.terrains ?? []);

  return (
    <div className="@container flex flex-col gap-5">
      {!type && raids.length > 0 && (
        <Field label={t("tools.raidDetails.recommended")}>
          <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @3xl:grid-cols-3">
            {(showAllRaids ? raids : raids.slice(0, RECOMMENDED_COUNT)).map(
              (item) => (
                <RoadmapRaidCard
                  key={item.id}
                  item={item}
                  now={now}
                  onClick={() => selectRaid(item)}
                />
              ),
            )}
          </div>

          {raids.length > RECOMMENDED_COUNT && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-center"
              onClick={() => setShowAllRaids((prev) => !prev)}
            >
              {showAllRaids
                ? t("tools.raidDetails.showLess")
                : t("tools.raidDetails.showAll", {
                    count: raids.length,
                  })}
            </Button>
          )}
        </Field>
      )}

      <Field
        label={t("tools.raidDetails.type")}
        action={
          value ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onChange(undefined)}
            >
              <RotateCcwIcon />
              {inferred
                ? t("tools.raidDetails.resetToAuto")
                : t("tools.raidDetails.clear")}
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @3xl:grid-cols-5">
          {RAID_TYPES.map((option) => (
            <Choice
              key={option}
              selected={value?.type === option}
              hinted={!value && type === option}
              onClick={() => selectType(option)}
            >
              {t(`static.roadmap.raidTypes.${option}`)}
              {!value && type === option && <AutoHint />}
            </Choice>
          ))}
        </div>
      </Field>

      {type && season && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon className="size-4 shrink-0" />
          <span className="min-w-0">
            {t("tools.raidDetails.linkedSeason", {
              dates: formatRaidDates(season, locale),
            })}
          </span>

          {value?.season && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("tools.raidDetails.unlinkSeason")}
              title={t("tools.raidDetails.unlinkSeason")}
              onClick={() =>
                update({
                  season: undefined,
                })
              }
            >
              <XIcon />
            </Button>
          )}
        </div>
      )}

      {type && (
        <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <Field label={t(`tools.raidDetails.boss.${type}`)}>
            <RaidBossPicker
              type={type}
              value={resolved?.boss}
              hinted={hasBossHint}
              badge={hasBossHint ? <AutoHint /> : undefined}
              onChange={selectBoss}
            />
          </Field>

          <div className="flex min-w-0 flex-col gap-5">
            <Field label={t("tools.raidDetails.defense")}>
              <div className="flex flex-wrap gap-2">
                {defenseOptions.map((option) => {
                  const hinted = defenseHints.includes(option);

                  return (
                    <Choice
                      key={option}
                      selected={!!value?.defenseTypes?.includes(option)}
                      hinted={hinted}
                      onClick={() => selectDefense(option)}
                      className="@max-2xl:flex-1"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-2.5 rounded-full",
                          DEFENSE_COLORS[option] ?? "bg-slate-500",
                        )}
                      />
                      {t(`common.defenseType.${option}`)}
                      {hinted && <AutoHint />}
                    </Choice>
                  );
                })}
              </div>
            </Field>

            <Field label={t("tools.raidDetails.terrain")}>
              <div className="flex flex-wrap gap-2">
                {TERRAINS.map((option) => {
                  const hinted = terrainHints.includes(option);

                  return (
                    <Choice
                      key={option}
                      selected={!!value?.terrains?.includes(option)}
                      hinted={hinted}
                      onClick={() => selectTerrain(option)}
                      className="@max-2xl:flex-1"
                    >
                      <img
                        src={TERRAIN_ICONS[option].src}
                        alt=""
                        draggable={false}
                        className="size-5 rounded-[3px]"
                      />
                      {t(`common.terrain.${option}`)}
                      {hinted && <AutoHint />}
                    </Choice>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>
      )}

      {type && supportsDifficulty(type, scope) && (
        <Field label={t("tools.raidDetails.difficulty")}>
          <div className="grid grid-cols-4 gap-2 @3xl:grid-cols-8">
            {RAID_DIFFICULTIES.map((option) => {
              const selected = value?.difficulty === option;
              const hinted = !selected && resolved?.difficulty === option;

              return (
                <Choice
                  key={option}
                  selected={selected}
                  hinted={hinted}
                  onClick={() => selectDifficulty(option)}
                  className="px-1"
                >
                  {t(`common.difficulties.${option}`)}
                  {hinted && <AutoHint />}
                </Choice>
              );
            })}
          </div>
        </Field>
      )}

      {type && supportsFloor(type, scope) && (
        <RaidFloorField
          floor={value?.floor}
          onChange={(floor) =>
            update({
              floor,
            })
          }
        />
      )}
    </div>
  );
}

function RaidFloorField({
  floor,
  onChange,
}: {
  floor: number | undefined;
  onChange: (floor: number | undefined) => void;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState<string | null>(null);

  function commit(text: string) {
    setDraft(null);

    if (text === "") {
      onChange(undefined);
      return;
    }

    const parsed = Math.round(Number(text));

    onChange(
      Number.isNaN(parsed)
        ? floor
        : Math.min(Math.max(parsed, MIN_RAID_FLOOR), MAX_RAID_FLOOR),
    );
  }

  return (
    <Field label={t("tools.raidDetails.floor")}>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={MIN_RAID_FLOOR}
          max={MAX_RAID_FLOOR}
          step={1}
          className="w-28"
          placeholder={`${MIN_RAID_FLOOR}–${MAX_RAID_FLOOR}`}
          value={draft ?? floor ?? ""}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(event.currentTarget.value);
            }
          }}
        />
      </div>
    </Field>
  );
}
