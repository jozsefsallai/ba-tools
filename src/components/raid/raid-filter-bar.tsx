"use client";

import { XIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { SearchBar } from "@/components/common/list-controls";
import { MultiSelectFilter } from "@/components/common/multi-select-filter";
import { RaidBossFilter } from "@/components/raid/raid-boss-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ALL_RAID_INFO_BOSSES,
  COMMON_DEFENSE_TYPES,
  DEFENSE_TYPES,
  getBossOptions,
  hasRaidFilters,
  MAX_RAID_FLOOR,
  MIN_RAID_FLOOR,
  RAID_DIFFICULTIES,
  RAID_TYPES,
  type RaidFilters,
  type RaidInfoScope,
  supportsDifficulty,
  supportsFloor,
  TERRAINS,
} from "@/lib/raid-info";
import { DEFENSE_COLORS } from "@/lib/raid-labels";
import { TERRAIN_ICONS } from "@/lib/terrain";
import { cn } from "@/lib/utils";
import type { RaidType } from "~prisma";

const FILTER_PARAMS = {
  types: "type",
  bosses: "boss",
  defenseTypes: "defense",
  terrains: "terrain",
  difficulties: "difficulty",
  floorMin: "floorMin",
  floorMax: "floorMax",
} as const;

function parseList<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T[] | undefined {
  const list = (value?.split(",") ?? []).filter((item): item is T =>
    allowed.includes(item as T),
  );

  return list.length > 0 ? list : undefined;
}

function parseFloor(value: string | null) {
  const floor = value ? Number(value) : Number.NaN;

  return Number.isInteger(floor) &&
    floor >= MIN_RAID_FLOOR &&
    floor <= MAX_RAID_FLOOR
    ? floor
    : undefined;
}

export function useRaidFilterParams() {
  const searchParams = useSearchParams();

  const filters = useMemo<RaidFilters>(
    () => ({
      types: parseList(searchParams.get(FILTER_PARAMS.types), RAID_TYPES),
      bosses: parseList(
        searchParams.get(FILTER_PARAMS.bosses),
        ALL_RAID_INFO_BOSSES,
      ),
      defenseTypes: parseList(
        searchParams.get(FILTER_PARAMS.defenseTypes),
        DEFENSE_TYPES,
      ),
      terrains: parseList(searchParams.get(FILTER_PARAMS.terrains), TERRAINS),
      difficulties: parseList(
        searchParams.get(FILTER_PARAMS.difficulties),
        RAID_DIFFICULTIES,
      ),
      floorMin: parseFloor(searchParams.get(FILTER_PARAMS.floorMin)),
      floorMax: parseFloor(searchParams.get(FILTER_PARAMS.floorMax)),
    }),
    [
      searchParams,
    ],
  );

  const setFilters = useCallback((next: RaidFilters) => {
    const url = new URL(window.location.href);

    for (const [key, param] of Object.entries(FILTER_PARAMS)) {
      const value = next[key as keyof RaidFilters];
      const text = Array.isArray(value) ? value.join(",") : value?.toString();

      if (text) {
        url.searchParams.set(param, text);
      } else {
        url.searchParams.delete(param);
      }
    }

    window.history.replaceState(null, "", url);
  }, []);

  return [
    filters,
    setFilters,
  ] as const;
}

function withTypes(
  filters: RaidFilters,
  types: RaidType[],
  scope: RaidInfoScope,
): RaidFilters {
  const bossOptions = new Set(types.flatMap((type) => getBossOptions(type)));
  const hasDifficulty = types.some((type) => supportsDifficulty(type, scope));
  const hasFloor = types.some((type) => supportsFloor(type, scope));

  return {
    ...filters,
    types,
    bosses: filters.bosses?.filter((boss) => bossOptions.has(boss)),
    difficulties: hasDifficulty ? filters.difficulties : undefined,
    floorMin: hasFloor ? filters.floorMin : undefined,
    floorMax: hasFloor ? filters.floorMax : undefined,
  };
}

export type RaidFilterBarProps = {
  scope: RaidInfoScope;
  search: string;
  onSearchChange: (search: string) => void;
  filters: RaidFilters;
  onFiltersChange: (filters: RaidFilters) => void;
  inDialog?: boolean;
  className?: string;
};

export function RaidFilterBar({
  scope,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  inDialog,
  className,
}: RaidFilterBarProps) {
  const t = useTranslations();

  const types = filters.types ?? [];

  const bossOptions = useMemo(() => {
    const options = new Map<string, RaidType>();

    for (const type of types) {
      for (const boss of getBossOptions(type)) {
        if (!options.has(boss)) {
          options.set(boss, type);
        }
      }
    }

    return Array.from(options, ([boss, type]) => ({
      boss,
      type,
    }));
  }, [
    types,
  ]);

  const showDifficulty = types.some((type) => supportsDifficulty(type, scope));
  const showFloor = types.some((type) => supportsFloor(type, scope));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <SearchBar
        value={search}
        onChange={onSearchChange}
        placeholder={t(`tools.raidDetails.filters.search.${scope}`)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <MultiSelectFilter
          label={t("tools.raidDetails.filters.type")}
          options={RAID_TYPES.map((type) => ({
            value: type,
            label: t(`static.roadmap.raidTypes.${type}`),
          }))}
          selected={types}
          onChange={(next) => onFiltersChange(withTypes(filters, next, scope))}
        />

        {bossOptions.length > 0 && (
          <RaidBossFilter
            modal={inDialog}
            label={t("tools.raidDetails.filters.boss")}
            options={bossOptions}
            selected={filters.bosses ?? []}
            onChange={(bosses) =>
              onFiltersChange({
                ...filters,
                bosses,
              })
            }
          />
        )}

        <MultiSelectFilter
          label={t("tools.raidDetails.filters.defense")}
          options={COMMON_DEFENSE_TYPES.map((type) => ({
            value: type,
            label: t(`common.defenseType.${type}`),
            icon: (
              <span
                aria-hidden
                className={cn("size-2.5 rounded-full", DEFENSE_COLORS[type])}
              />
            ),
          }))}
          selected={filters.defenseTypes ?? []}
          onChange={(defenseTypes) =>
            onFiltersChange({
              ...filters,
              defenseTypes,
            })
          }
        />

        <MultiSelectFilter
          label={t("tools.raidDetails.filters.terrain")}
          options={TERRAINS.map((terrain) => ({
            value: terrain,
            label: t(`common.terrain.${terrain}`),
            icon: (
              <img
                src={TERRAIN_ICONS[terrain].src}
                alt=""
                className="size-4 rounded-[3px]"
              />
            ),
          }))}
          selected={filters.terrains ?? []}
          onChange={(terrains) =>
            onFiltersChange({
              ...filters,
              terrains,
            })
          }
        />

        {showDifficulty && (
          <MultiSelectFilter
            label={t("tools.raidDetails.filters.difficulty")}
            options={RAID_DIFFICULTIES.map((difficulty) => ({
              value: difficulty,
              label: t(`common.difficulties.${difficulty}`),
            }))}
            selected={filters.difficulties ?? []}
            onChange={(difficulties) =>
              onFiltersChange({
                ...filters,
                difficulties,
              })
            }
          />
        )}

        {showFloor && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">
              {t("tools.raidDetails.filters.floor")}
            </span>

            <Input
              type="number"
              inputMode="numeric"
              min={MIN_RAID_FLOOR}
              max={MAX_RAID_FLOOR}
              aria-label={t("tools.raidDetails.filters.floorFrom")}
              placeholder={t("tools.raidDetails.filters.floorFrom")}
              className="h-8 w-20"
              value={filters.floorMin ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  floorMin: parseFloor(event.target.value),
                })
              }
            />

            <Input
              type="number"
              inputMode="numeric"
              min={MIN_RAID_FLOOR}
              max={MAX_RAID_FLOOR}
              aria-label={t("tools.raidDetails.filters.floorTo")}
              placeholder={t("tools.raidDetails.filters.floorTo")}
              className="h-8 w-20"
              value={filters.floorMax ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  floorMax: parseFloor(event.target.value),
                })
              }
            />
          </div>
        )}

        {hasRaidFilters(filters) && (
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange({})}>
            <XIcon />
            {t("tools.raidDetails.filters.clearAll")}
          </Button>
        )}
      </div>
    </div>
  );
}
