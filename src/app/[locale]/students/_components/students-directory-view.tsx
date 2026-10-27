"use client";

import { StudentGridCard } from "@/app/[locale]/students/_components/student-grid-card";
import {
  ACQUISITION_KINDS,
  ATTACK_TYPES,
  type AcquisitionKind,
  COMBAT_CLASSES,
  COMBAT_POSITIONS,
  COMBAT_ROLES,
  DEFENSE_TYPES,
  EQUIPMENT_KINDS,
  GAME_SERVER_KEYS,
  type GameServerKey,
  RARITIES,
  SCHOOLS,
  TERRAINS,
  WEAPON_TYPES,
  getAcquisitionKind,
  getAttackTypeColorClass,
  getDefenseTypeColorClass,
  hasBondGearOn,
  isReleasedOn,
} from "@/app/[locale]/students/_lib/student-display";
import {
  STUDENT_LIST_RESTORE_KEY,
  saveStudentListQuery,
} from "@/app/[locale]/students/_lib/student-list-state";
import {
  SORT_KEYS,
  type SortDirection,
  type SortDisplayValue,
  type SortKey,
  getDefaultSortDirection,
  getSortDisplayValue,
  sortStudents,
} from "@/app/[locale]/students/_lib/student-sort";
import {
  EquipmentIcon,
  type EquipmentKind,
} from "@/components/common/equipment-icon";
import {
  GroupedToggleFilter,
  type GroupedToggleGroup,
  type GroupedToggleOption,
} from "@/components/common/grouped-toggle-filter";
import {
  MultiSelectFilter,
  type MultiSelectFilterOption,
} from "@/components/common/multi-select-filter";
import { SchoolLogo } from "@/components/common/school-logo";
import { StudentRoleIcon } from "@/components/common/student-role-icon";
import { VirtualGrid } from "@/components/common/virtual-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useStudents } from "@/hooks/use-students";
import { orderStudentsByFuzzyNameQuery } from "@/lib/student-search-query";
import {
  TERRAIN_GRADES_DESC,
  TERRAIN_ICONS,
  TERRAIN_MOOD_ICONS,
  type TerrainGrade,
  getTerrainGrade,
} from "@/lib/terrain";
import { cn } from "@/lib/utils";
import {
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  AttackType,
  CombatClass,
  CombatPosition,
  CombatRole,
  DefenseType,
  School,
  WeaponType,
} from "~prisma";

const YES_NO = ["yes", "no"] as const;
type YesNo = (typeof YES_NO)[number];

type Filters = {
  school: School[];
  attackType: AttackType[];
  defenseType: DefenseType[];
  role: CombatRole[];
  combatClass: CombatClass[];
  position: CombatPosition[];
  weapon: WeaponType[];
  rarity: number[];
  acquisition: AcquisitionKind[];
  terrainStreet: TerrainGrade[];
  terrainOutdoor: TerrainGrade[];
  terrainIndoor: TerrainGrade[];
  equipment1: EquipmentKind[];
  equipment2: EquipmentKind[];
  equipment3: EquipmentKind[];
  bondGear: YesNo[];
  range: number[];
};

type ListFilterKey = keyof Filters;

const FILTER_PARAM_NAMES: Record<ListFilterKey, string> = {
  school: "school",
  attackType: "atk",
  defenseType: "def",
  role: "role",
  combatClass: "class",
  position: "pos",
  weapon: "weapon",
  rarity: "rarity",
  acquisition: "acq",
  terrainStreet: "urban",
  terrainOutdoor: "outdoor",
  terrainIndoor: "indoor",
  equipment1: "eq1",
  equipment2: "eq2",
  equipment3: "eq3",
  bondGear: "bg",
  range: "range",
};

const NUMERIC_FILTERS: ListFilterKey[] = ["rarity", "range"];

const TERRAIN_FILTER_KEYS = {
  Street: "terrainStreet",
  Outdoor: "terrainOutdoor",
  Indoor: "terrainIndoor",
} as const satisfies Record<(typeof TERRAINS)[number]["key"], ListFilterKey>;

const EQUIPMENT_FILTER_KEYS = [
  "equipment1",
  "equipment2",
  "equipment3",
] as const satisfies ListFilterKey[];

// `null` accepts any value (ranges come from the data).
const FILTER_ALLOWED_VALUES: Record<
  ListFilterKey,
  readonly (string | number)[] | null
> = {
  school: SCHOOLS,
  attackType: ATTACK_TYPES,
  defenseType: DEFENSE_TYPES,
  role: COMBAT_ROLES,
  combatClass: COMBAT_CLASSES,
  position: COMBAT_POSITIONS,
  weapon: WEAPON_TYPES,
  rarity: RARITIES,
  acquisition: ACQUISITION_KINDS,
  terrainStreet: TERRAIN_GRADES_DESC,
  terrainOutdoor: TERRAIN_GRADES_DESC,
  terrainIndoor: TERRAIN_GRADES_DESC,
  equipment1: EQUIPMENT_KINDS,
  equipment2: EQUIPMENT_KINDS,
  equipment3: EQUIPMENT_KINDS,
  bondGear: YES_NO,
  range: null,
};

const EMPTY_FILTERS: Filters = {
  school: [],
  attackType: [],
  defenseType: [],
  role: [],
  combatClass: [],
  position: [],
  weapon: [],
  rarity: [],
  acquisition: [],
  terrainStreet: [],
  terrainOutdoor: [],
  terrainIndoor: [],
  equipment1: [],
  equipment2: [],
  equipment3: [],
  bondGear: [],
  range: [],
};

function parseFilters(searchParams: URLSearchParams): Filters {
  const filters = { ...EMPTY_FILTERS };

  for (const key of Object.keys(FILTER_PARAM_NAMES) as ListFilterKey[]) {
    const raw = searchParams.get(FILTER_PARAM_NAMES[key]);
    if (!raw) {
      continue;
    }

    const allowed = FILTER_ALLOWED_VALUES[key];
    const values = raw
      .split(",")
      .map((v) => (NUMERIC_FILTERS.includes(key) ? Number.parseInt(v, 10) : v))
      .filter((v) =>
        allowed
          ? allowed.includes(v)
          : typeof v === "number" && Number.isFinite(v),
      );

    filters[key] = values as any;
  }

  return filters;
}

function parseServer(value: string | null): GameServerKey | null {
  return GAME_SERVER_KEYS.find((s) => s === value) ?? null;
}

function parseSort(value: string | null): SortKey {
  return SORT_KEYS.find((s) => s === value) ?? "default";
}

function parseSortDirection(
  value: string | null,
  sort: SortKey,
): SortDirection {
  return value === "asc" || value === "desc"
    ? value
    : getDefaultSortDirection(sort);
}

export function StudentsDirectoryView() {
  const t = useTranslations();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { students } = useStudents();

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [filters, setFilters] = useState(() => parseFilters(searchParams));
  const [server, setServer] = useState(() =>
    parseServer(searchParams.get("server")),
  );
  const [sort, setSort] = useState(() => parseSort(searchParams.get("sort")));
  const [sortDirection, setSortDirection] = useState(() =>
    parseSortDirection(searchParams.get("dir"), sort),
  );

  const debouncedSearch = useDebounce(search, 150);

  // Mirror the state into the URL so filtered views can be shared, without
  // triggering a navigation.
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch.trim()) {
      params.set("q", debouncedSearch.trim());
    }

    for (const key of Object.keys(FILTER_PARAM_NAMES) as ListFilterKey[]) {
      if (filters[key].length > 0) {
        params.set(FILTER_PARAM_NAMES[key], filters[key].join(","));
      }
    }

    if (server) {
      params.set("server", server);
    }

    if (sort !== "default") {
      params.set("sort", sort);
    }

    if (sortDirection !== getDefaultSortDirection(sort)) {
      params.set("dir", sortDirection);
    }

    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", url);
    saveStudentListQuery(query);
  }, [debouncedSearch, filters, server, sort, sortDirection]);

  function changeSort(next: SortKey) {
    setSort(next);
    setSortDirection(getDefaultSortDirection(next));
  }

  function setFilter<K extends ListFilterKey>(key: K, value: Filters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    server !== null ||
    Object.values(filters).some((values) => values.length > 0);

  function clearAll() {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    setServer(null);
  }

  const results = useMemo(() => {
    const acquisitionServer = server ?? "jp";

    const filtered = students.filter((student) => {
      if (server && !isReleasedOn(student, server)) {
        return false;
      }

      const checks: [unknown[], unknown][] = [
        [filters.school, student.school],
        [filters.attackType, student.attackType],
        [filters.defenseType, student.defenseType],
        [filters.role, student.combatRole],
        [filters.combatClass, student.combatClass],
        [filters.position, student.combatPosition],
        [filters.weapon, student.weaponType],
        [filters.rarity, student.rarity],
        [filters.acquisition, getAcquisitionKind(student, acquisitionServer)],
        [
          filters.terrainStreet,
          getTerrainGrade(student.streetBattleAdaptation),
        ],
        [
          filters.terrainOutdoor,
          getTerrainGrade(student.outdoorBattleAdaptation),
        ],
        [
          filters.terrainIndoor,
          getTerrainGrade(student.indoorBattleAdaptation),
        ],
        [filters.equipment1, student.equipment[0]],
        [filters.equipment2, student.equipment[1]],
        [filters.equipment3, student.equipment[2]],
        [
          filters.bondGear,
          hasBondGearOn(student, acquisitionServer) ? "yes" : "no",
        ],
        [filters.range, student.range],
      ];

      return checks.every(
        ([selected, value]) =>
          selected.length === 0 || selected.includes(value),
      );
    });

    if (debouncedSearch.trim()) {
      return orderStudentsByFuzzyNameQuery(filtered, debouncedSearch).ordered;
    }

    return sortStudents(filtered, sort, sortDirection);
  }, [students, filters, server, sort, sortDirection, debouncedSearch]);

  const isSearching = debouncedSearch.trim().length > 0;
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const rangeValues = useMemo(
    () =>
      [...new Set(students.map((student) => student.range))]
        .filter((range) => range > 0)
        .sort((a, b) => a - b),
    [students],
  );

  const schoolOptions: MultiSelectFilterOption<School>[] = SCHOOLS.map(
    (school) => ({
      value: school,
      label: t(`common.school.${school}`),
      icon: <SchoolLogo school={school} className="h-4 w-[18px]" />,
    }),
  );

  const attackTypeOptions: MultiSelectFilterOption<AttackType>[] =
    ATTACK_TYPES.map((type) => ({
      value: type,
      label: t(`common.attackType.${type}`),
      icon: (
        <span
          className={cn("size-3 rounded-full", getAttackTypeColorClass(type))}
        />
      ),
    }));

  const defenseTypeOptions: MultiSelectFilterOption<DefenseType>[] =
    DEFENSE_TYPES.map((type) => ({
      value: type,
      label: t(`common.defenseType.${type}`),
      icon: (
        <span
          className={cn("size-3 rounded-full", getDefenseTypeColorClass(type))}
        />
      ),
    }));

  const roleOptions: MultiSelectFilterOption<CombatRole>[] = COMBAT_ROLES.map(
    (role) => ({
      value: role,
      label: t(`common.combatRole.${role}`),
      icon: (
        <StudentRoleIcon student={{ combatRole: role }} className="size-5" />
      ),
    }),
  );

  const classOptions: MultiSelectFilterOption<CombatClass>[] =
    COMBAT_CLASSES.map((combatClass) => ({
      value: combatClass,
      label: t(`common.combatClass.${combatClass}`),
    }));

  const positionOptions: MultiSelectFilterOption<CombatPosition>[] =
    COMBAT_POSITIONS.map((position) => ({
      value: position,
      label: t(`common.combatPosition.${position}`),
    }));

  const weaponOptions: MultiSelectFilterOption<WeaponType>[] = WEAPON_TYPES.map(
    (weapon) => ({
      value: weapon,
      label: `${weapon} · ${t(`common.weaponType.${weapon}`)}`,
    }),
  );

  const rarityOptions: MultiSelectFilterOption<number>[] = RARITIES.map(
    (rarity) => ({ value: rarity, label: "★".repeat(rarity) }),
  );

  const terrainGroups: GroupedToggleGroup<
    keyof typeof TERRAIN_FILTER_KEYS,
    TerrainGrade
  >[] = TERRAINS.map((terrain) => ({
    key: terrain.key,
    label: t(`common.terrain.${terrain.key}`),
    icon: (
      <img
        src={TERRAIN_ICONS[terrain.key].src}
        alt=""
        aria-hidden
        className="size-4"
      />
    ),
  }));

  const terrainOptions: GroupedToggleOption<TerrainGrade>[] =
    TERRAIN_GRADES_DESC.map((grade) => ({
      value: grade,
      label: grade,
      icon: (
        <img
          src={TERRAIN_MOOD_ICONS[grade].src}
          alt=""
          aria-hidden
          className="size-4"
        />
      ),
    }));

  const equipmentGroups = useMemo(
    () =>
      EQUIPMENT_FILTER_KEYS.map(
        (key, idx): GroupedToggleGroup<typeof key, EquipmentKind> => {
          const kinds = new Set(students.map((s) => s.equipment[idx]));

          return {
            key,
            label: t("tools.students.filters.equipmentSlot", { slot: idx + 1 }),
            options: EQUIPMENT_KINDS.filter((kind) => kinds.has(kind)).map(
              (equipment) => ({
                value: equipment,
                label: t(`common.equipment.${equipment}`),
                icon: (
                  <EquipmentIcon equipment={equipment} className="h-7 w-auto" />
                ),
              }),
            ),
          };
        },
      ),
    [students, t],
  );

  const bondGearOptions: MultiSelectFilterOption<YesNo>[] = YES_NO.map(
    (value) => ({ value, label: t(`common.${value}`) }),
  );

  const rangeOptions: MultiSelectFilterOption<number>[] = rangeValues.map(
    (range) => ({ value: range, label: numberFormat.format(range) }),
  );

  const acquisitionOptions: MultiSelectFilterOption<AcquisitionKind>[] =
    ACQUISITION_KINDS.map((kind) => ({
      value: kind,
      label: t(`tools.students.acquisition.${kind}`),
    }));

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card flex flex-col gap-3 rounded-xl border p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("tools.students.filters.searchPlaceholder")}
              className="pl-8"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={server ?? "any"}
              onValueChange={(value) =>
                setServer(value === "any" ? null : parseServer(value))
              }
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="any">
                  {t("tools.students.filters.anyServer")}
                </SelectItem>

                {GAME_SERVER_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`tools.students.servers.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sort}
              onValueChange={(value) => changeSort(parseSort(value))}
              disabled={isSearching}
            >
              <SelectTrigger className="w-full sm:w-52">
                <span className="text-muted-foreground">
                  {t("tools.students.filters.sort")}:
                </span>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {SORT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`tools.students.filters.sortOptions.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={isSearching}
              onClick={() =>
                setSortDirection((direction) =>
                  direction === "asc" ? "desc" : "asc",
                )
              }
              title={t(`tools.students.filters.sortDirection.${sortDirection}`)}
            >
              {sortDirection === "asc" ? (
                <ArrowUpNarrowWideIcon />
              ) : (
                <ArrowDownWideNarrowIcon />
              )}

              <span className="sr-only">
                {t(`tools.students.filters.sortDirection.${sortDirection}`)}
              </span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <MultiSelectFilter
            label={t("tools.students.filters.school")}
            options={schoolOptions}
            selected={filters.school}
            onChange={(v) => setFilter("school", v)}
          />

          <MultiSelectFilter
            label={t("tools.students.filters.attackType")}
            options={attackTypeOptions}
            selected={filters.attackType}
            onChange={(v) => setFilter("attackType", v)}
          />

          <MultiSelectFilter
            label={t("tools.students.filters.defenseType")}
            options={defenseTypeOptions}
            selected={filters.defenseType}
            onChange={(v) => setFilter("defenseType", v)}
          />

          <MultiSelectFilter
            label={t("tools.students.filters.role")}
            options={roleOptions}
            selected={filters.role}
            onChange={(v) => setFilter("role", v)}
          />

          <MultiSelectFilter
            label={t("tools.students.filters.class")}
            options={classOptions}
            selected={filters.combatClass}
            onChange={(v) => setFilter("combatClass", v)}
          />

          <MultiSelectFilter
            label={t("tools.students.filters.position")}
            options={positionOptions}
            selected={filters.position}
            onChange={(v) => setFilter("position", v)}
          />

          <MultiSelectFilter
            label={t("tools.students.filters.weapon")}
            options={weaponOptions}
            selected={filters.weapon}
            onChange={(v) => setFilter("weapon", v)}
          />

          <MultiSelectFilter
            label={t("tools.students.filters.rarity")}
            options={rarityOptions}
            selected={filters.rarity}
            onChange={(v) => setFilter("rarity", v)}
          />

          <MultiSelectFilter
            label={t("tools.students.filters.acquisition")}
            options={acquisitionOptions}
            selected={filters.acquisition}
            onChange={(v) => setFilter("acquisition", v)}
          />

          <GroupedToggleFilter
            label={t("tools.students.filters.terrain")}
            groups={terrainGroups}
            options={terrainOptions}
            selected={{
              Street: filters.terrainStreet,
              Outdoor: filters.terrainOutdoor,
              Indoor: filters.terrainIndoor,
            }}
            onChange={(terrain, v) =>
              setFilter(TERRAIN_FILTER_KEYS[terrain], v)
            }
          />

          <GroupedToggleFilter
            label={t("tools.students.filters.equipment")}
            groups={equipmentGroups}
            selected={{
              equipment1: filters.equipment1,
              equipment2: filters.equipment2,
              equipment3: filters.equipment3,
            }}
            onChange={(slot, v) => setFilter(slot, v)}
            iconOnly
            toggleClassName="h-10 px-1.5 dark:bg-zinc-600 dark:hover:bg-zinc-500"
            pressedToggleClassName="bg-white hover:bg-white dark:bg-white dark:hover:bg-white"
          />

          <MultiSelectFilter
            label={t("tools.students.filters.bondGear")}
            options={bondGearOptions}
            selected={filters.bondGear}
            onChange={(v) => setFilter("bondGear", v)}
          />

          <MultiSelectFilter
            label={t("tools.students.filters.range")}
            options={rangeOptions}
            selected={filters.range}
            onChange={(v) => setFilter("range", v)}
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <XIcon />
              {t("tools.students.filters.clear")}
            </Button>
          )}
        </div>
      </div>

      <div className="text-muted-foreground text-sm">
        {t("tools.students.filters.results", { count: results.length })}
      </div>

      {results.length > 0 ? (
        <VirtualGrid
          items={results}
          getKey={(student) => student.id}
          restoreKey={STUDENT_LIST_RESTORE_KEY}
          renderItem={(student) => {
            const sortValue = isSearching
              ? null
              : getSortDisplayValue(student, sort, numberFormat);

            return (
              <StudentGridCard
                student={student}
                title={`${student.name} · ${t(`common.school.${student.school}`)}`}
                label={sortValue && <SortValueLabel value={sortValue} />}
              />
            );
          }}
        />
      ) : (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          {t("tools.students.filters.noResults")}
        </div>
      )}
    </div>
  );
}

function SortValueLabel({ value }: { value: SortDisplayValue }) {
  if (value.kind === "terrain") {
    return (
      <span className="inline-flex items-center justify-center gap-1">
        <img
          src={TERRAIN_MOOD_ICONS[value.grade].src}
          alt=""
          aria-hidden
          className="size-4"
        />
        {value.grade}
      </span>
    );
  }

  return <span className="tabular-nums">{value.text}</span>;
}
