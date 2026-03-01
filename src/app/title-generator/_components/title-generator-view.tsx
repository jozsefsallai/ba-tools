"use client";

import { StudentPicker } from "@/components/common/student-picker";
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
import { useStudents } from "@/hooks/use-students";
import {
  BOSS_EMBLEM_NAMES,
  BOSS_EMBLEM_TERRAINS,
  type BossEmblemRarity,
  DEFAULT_BASIC_EMBLEM_TEXTS,
  FAVOR_EMBLEM_EXTRA_ARONA,
  FAVOR_EMBLEM_EXTRA_PLANA,
  type FavorEmblemExtra,
  type FavorEmblemRank,
  GROUP_EMBLEM_CLUBS,
  GROUP_EMBLEM_SCHOOLS,
  GROUP_EMBLEM_VALID_COMBINATIONS,
  type PotentialEmblemRank,
  TOWER_EMBLEM_BOSSES,
  TOWER_EMBLEM_DEFENSE_TYPES,
  type TowerEmblemDefenseType,
  VALID_BOSS_EMBLEM_COMBINATIONS,
} from "@/lib/emblems";
import { cn } from "@/lib/utils";
import type { Club, School, Student } from "~prisma";
import { ChevronsUpDownIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type TitleGeneratorMode =
  | "basic"
  | "favor"
  | "potential"
  | "boss"
  | "group"
  | "tower";

export function TitleGeneratorView() {
  const t = useTranslations();

  const { students } = useStudents();

  const [clientReady, setClientReady] = useState(false);

  const [mode, setMode] = useState<TitleGeneratorMode>("basic");

  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  const [defaultUrls, setDefaultUrls] = useState<string[]>([]);

  // basic
  const [basicText, setBasicText] = useState("Hello");
  const [basicTextStr, setBasicTextStr] = useState("Hello");

  // favor
  const [favorStudent, setFavorStudent] = useState<Student | FavorEmblemExtra>(
    students[0],
  );
  const [favorRank, setFavorRank] = useState<FavorEmblemRank>(20);
  const [favorNameOverride, setFavorNameOverride] = useState("");
  const [favorNameOverrideStr, setFavorNameOverrideStr] = useState("");

  // potential
  const [potentialStudent, setPotentialStudent] = useState<Student>(
    students[0],
  );
  const [potentialRank, setPotentialRank] = useState<PotentialEmblemRank>(25);
  const [potentialNameOverride, setPotentialNameOverride] = useState("");
  const [potentialNameOverrideStr, setPotentialNameOverrideStr] = useState("");

  // boss
  const [bossItem, setBossItem] = useState<
    (typeof VALID_BOSS_EMBLEM_COMBINATIONS)[number]
  >(VALID_BOSS_EMBLEM_COMBINATIONS[0]);
  const [bossRarity, setBossRarity] = useState<BossEmblemRarity>("N");

  // tower
  const [towerBossItem, setTowerBossItem] = useState<
    (typeof TOWER_EMBLEM_BOSSES)[number]
  >(TOWER_EMBLEM_BOSSES[0]);
  const [towerDefenseType, setTowerDefenseType] =
    useState<TowerEmblemDefenseType>("Light");
  const [towerFloor, setTowerFloor] = useState<50 | 100>(50);

  // group
  const [groupSchool, setGroupSchool] = useState<School>("Abydos");
  const [groupClub, setGroupClub] = useState<Club>("Countermeasure");
  const [groupNameOverride, setGroupNameOverride] = useState("");
  const [groupNameOverrideStr, setGroupNameOverrideStr] = useState("");

  const bossNames = useMemo(() => {
    const names: Record<string, string> = {};

    for (const boss of BOSS_EMBLEM_NAMES) {
      names[boss.id] = boss.name;
    }

    return names;
  }, []);

  const terrainNames = useMemo(() => {
    const names: Record<string, string> = {};

    for (const combo of BOSS_EMBLEM_TERRAINS) {
      names[combo.id] = combo.name;
    }

    return names;
  }, []);

  const schoolNames = useMemo(() => {
    const names: Record<string, string> = {};

    for (const combo of GROUP_EMBLEM_SCHOOLS) {
      names[combo.id] = combo.name;
    }

    return names;
  }, []);

  const clubs = useMemo(() => {
    const validClubs = GROUP_EMBLEM_VALID_COMBINATIONS.filter(
      (c) => c.school === groupSchool,
    ).map((c) => c.club);

    return GROUP_EMBLEM_CLUBS.filter((c) => validClubs.includes(c.id));
  }, [groupSchool]);

  const bossItemValue = useMemo(() => {
    return `${bossItem.name}_${bossItem.terrain}`;
  }, [bossItem]);

  const towerBossItemValue = useMemo(() => {
    return towerBossItem.name;
  }, [towerBossItem]);

  const url = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    switch (mode) {
      case "basic":
        return `/api/emblem/basic/${encodeURIComponent(basicText)}.png`;
      case "favor": {
        let baseUrl = `/api/emblem/favor/${favorStudent.schaleDbId ?? favorStudent.devName}/${favorRank}.png`;

        if (favorNameOverride.trim().length > 0) {
          baseUrl += `?name=${encodeURIComponent(favorNameOverride.trim())}`;
        }

        return baseUrl;
      }
      case "potential": {
        let baseUrl = `/api/emblem/potential/${potentialStudent.schaleDbId ?? potentialStudent.devName}/${potentialRank}.png`;

        if (potentialNameOverride.trim().length > 0) {
          baseUrl += `?name=${encodeURIComponent(
            potentialNameOverride.trim(),
          )}`;
        }

        return baseUrl;
      }
      case "boss": {
        return `/api/emblem/boss/${bossItem.name}/${bossItem.terrain}/${bossRarity}.png`;
      }
      case "tower": {
        return `/api/emblem/tower/${towerBossItem.name}/${towerDefenseType}/${towerFloor}.png`;
      }
      case "group": {
        return groupNameOverride.trim().length > 0
          ? `/api/emblem/group/${groupSchool}/${encodeURIComponent(groupNameOverride.trim())}.png`
          : `/api/emblem/group/${groupSchool}/${groupClub}.png`;
      }
    }
  }, [
    mode,
    basicText,
    favorStudent,
    favorRank,
    favorNameOverride,
    potentialStudent,
    potentialRank,
    potentialNameOverride,
    bossItem,
    bossRarity,
    towerBossItem,
    towerDefenseType,
    towerFloor,
    groupSchool,
    groupClub,
    groupNameOverride,
  ]);

  const absoluteUrl = useMemo(() => {
    if (!url) {
      return url;
    }

    return new URL(url, window.location.href).toString();
  }, [url]);

  function handleBasicTextUpdate() {
    if (basicTextStr.trim().length === 0) {
      return;
    }

    setBasicText(basicTextStr);
  }

  function handleSetArona() {
    setFavorStudent(FAVOR_EMBLEM_EXTRA_ARONA);
  }

  function handleSetPlana() {
    setFavorStudent(FAVOR_EMBLEM_EXTRA_PLANA);
  }

  function handleSetBossItem(item: string) {
    const [name, terrain] = item.split("_");

    const foundItem = VALID_BOSS_EMBLEM_COMBINATIONS.find(
      (i) => i.name === name && i.terrain === terrain,
    );

    if (foundItem) {
      setBossItem(foundItem);
    }
  }

  function handleSetTowerBossItem(item: string) {
    const foundItem = TOWER_EMBLEM_BOSSES.find((i) => i.name === item);

    if (foundItem) {
      setTowerBossItem(foundItem);
    }
  }

  function handleSchoolChange(school: School) {
    setGroupSchool(school);

    const validClubs = GROUP_EMBLEM_VALID_COMBINATIONS.filter(
      (c) => c.school === school,
    ).map((c) => c.club);

    if (!validClubs.includes(groupClub)) {
      setGroupClub(validClubs[0]);
    }
  }

  function handleImageLoaded() {
    setLoading(false);
    setErrored(false);
  }

  function handleImageErrored() {
    setLoading(false);
    setErrored(true);
  }

  function handleViewDefaultsClick() {
    const newDefaults: string[] = [];

    if (mode === "basic") {
      for (const text of DEFAULT_BASIC_EMBLEM_TEXTS) {
        newDefaults.push(`/api/emblem/basic/${encodeURIComponent(text)}.png`);
      }
    }

    if (mode === "favor") {
      for (const student of students) {
        for (const rank of [20, 50, 100] as FavorEmblemRank[]) {
          newDefaults.push(
            `/api/emblem/favor/${student.schaleDbId ?? student.devName}/${rank}.png`,
          );
        }
      }

      for (const extraStudent of [
        FAVOR_EMBLEM_EXTRA_ARONA,
        FAVOR_EMBLEM_EXTRA_PLANA,
      ]) {
        for (const rank of [20, 50, 100] as FavorEmblemRank[]) {
          newDefaults.push(`/api/emblem/favor/${extraStudent.id}/${rank}.png`);
        }
      }
    }

    if (mode === "potential") {
      for (const student of students) {
        for (const rank of [25, 50] as PotentialEmblemRank[]) {
          newDefaults.push(
            `/api/emblem/potential/${student.schaleDbId ?? student.devName}/${rank}.png`,
          );
        }
      }
    }

    if (mode === "boss") {
      for (const combo of VALID_BOSS_EMBLEM_COMBINATIONS) {
        for (const rarity of ["N", "R", "SR", "SSR"] as BossEmblemRarity[]) {
          newDefaults.push(
            `/api/emblem/boss/${combo.name}/${combo.terrain}/${rarity}.png`,
          );
        }
      }
    }

    if (mode === "tower") {
      for (const boss of TOWER_EMBLEM_BOSSES) {
        for (const defenseType of TOWER_EMBLEM_DEFENSE_TYPES) {
          for (const floorOption of [50, 100] as (50 | 100)[]) {
            newDefaults.push(
              `/api/emblem/tower/${boss.name}/${defenseType}/${floorOption}.png`,
            );
          }
        }
      }
    }

    if (mode === "group") {
      for (const combo of GROUP_EMBLEM_VALID_COMBINATIONS) {
        newDefaults.push(`/api/emblem/group/${combo.school}/${combo.club}.png`);
      }
    }

    setDefaultUrls(newDefaults);
  }

  useEffect(() => {
    setLoading(true);
  }, [
    mode,
    basicText,
    favorStudent,
    favorRank,
    favorNameOverride,
    potentialStudent,
    potentialRank,
    potentialNameOverride,
    bossItem,
    bossRarity,
    groupSchool,
    groupClub,
    groupNameOverride,
  ]);

  useEffect(() => {
    setClientReady(true);
  }, []);

  return (
    <div className="md:w-2/3 mx-auto flex flex-col gap-6">
      {clientReady && url && absoluteUrl && (
        <div className="flex flex-col self-center items-center gap-2">
          <div className="relative">
            <img
              src={url}
              alt={t("tools.emblem.generatedTitleAlt")}
              onLoad={handleImageLoaded}
              onError={handleImageErrored}
              className={cn({
                "opacity-50": loading,
                hidden: errored,
              })}
            />

            {errored && (
              <img
                src={`/api/emblem/basic/${t("tools.emblem.error")}.png`}
                alt={t("tools.emblem.error")}
                className={cn({
                  "opacity-50": loading,
                })}
              />
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <LoaderCircleIcon className="animate-spin" />
              </div>
            )}
          </div>

          <Input
            type="text"
            value={absoluteUrl}
            readOnly
            onFocus={(e) => e.target.select()}
            className="w-4/5"
          />
        </div>
      )}

      <Separator />

      <div className="flex flex-col gap-1">
        <Label>{t("tools.emblem.mode")}</Label>

        <Select
          value={mode}
          onValueChange={(v) => setMode(v as TitleGeneratorMode)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="basic">
              {t("tools.emblem.modes.basic.title")}
            </SelectItem>
            <SelectItem value="favor">
              {t("tools.emblem.modes.favor.title")}
            </SelectItem>
            <SelectItem value="potential">
              {t("tools.emblem.modes.potential.title")}
            </SelectItem>
            <SelectItem value="boss">
              {t("tools.emblem.modes.boss.title")}
            </SelectItem>
            <SelectItem value="tower">
              {t("tools.emblem.modes.tower.title")}
            </SelectItem>
            <SelectItem value="group">
              {t("tools.emblem.modes.club.title")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-xl font-medium">{t("tools.emblem.options")}</div>

      {mode === "basic" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.basic.fields.text")}</Label>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={basicTextStr}
                onChange={(e) => setBasicTextStr(e.target.value)}
              />

              <Button onClick={handleBasicTextUpdate}>
                {t("tools.emblem.update")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === "favor" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.favor.fields.student")}</Label>
            <StudentPicker onStudentSelected={setFavorStudent}>
              <Button variant="outline" className="w-full justify-between">
                <span>{favorStudent.name}</span>
                <ChevronsUpDownIcon />
              </Button>
            </StudentPicker>

            <div className="flex gap-2">
              <Label>{t("tools.emblem.modes.favor.fields.extra")}</Label>

              <Button variant="outline" size="sm" onClick={handleSetArona}>
                {t("tools.emblem.modes.favor.fields.arona")}
              </Button>

              <Button variant="outline" size="sm" onClick={handleSetPlana}>
                {t("tools.emblem.modes.favor.fields.plana")}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.favor.fields.rank")}</Label>

            <Select
              value={String(favorRank)}
              onValueChange={(v) =>
                setFavorRank(Number.parseInt(v, 10) as FavorEmblemRank)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>
              {t("tools.emblem.modes.favor.fields.nameOverride")}
            </Label>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={favorNameOverrideStr}
                onChange={(e) => setFavorNameOverrideStr(e.target.value)}
              />

              <Button
                onClick={() => setFavorNameOverride(favorNameOverrideStr)}
              >
                {t("tools.emblem.update")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === "potential" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.potential.fields.student")}</Label>
            <StudentPicker onStudentSelected={setPotentialStudent}>
              <Button variant="outline" className="w-full justify-between">
                <span>{potentialStudent.name}</span>
                <ChevronsUpDownIcon />
              </Button>
            </StudentPicker>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.potential.fields.level")}</Label>

            <Select
              value={String(potentialRank)}
              onValueChange={(v) =>
                setPotentialRank(Number.parseInt(v, 10) as PotentialEmblemRank)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>
              {t("tools.emblem.modes.potential.fields.nameOverride")}
            </Label>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={potentialNameOverrideStr}
                onChange={(e) => setPotentialNameOverrideStr(e.target.value)}
              />

              <Button
                onClick={() =>
                  setPotentialNameOverride(potentialNameOverrideStr)
                }
              >
                {t("tools.emblem.update")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === "boss" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.boss.fields.boss")}</Label>

            <Select value={bossItemValue} onValueChange={handleSetBossItem}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {VALID_BOSS_EMBLEM_COMBINATIONS.map((item, idx) => (
                  <SelectItem key={idx} value={`${item.name}_${item.terrain}`}>
                    {bossNames[item.name]} - {terrainNames[item.terrain]}
                    {t("tools.emblem.bossTerrainSuffix")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.boss.fields.completion")}</Label>

            <Select
              value={bossRarity}
              onValueChange={(v) => setBossRarity(v as BossEmblemRarity)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="N">
                  {t("tools.emblem.bossCompletion.belowHardcore")}
                </SelectItem>
                <SelectItem value="R">
                  {t("tools.emblem.bossCompletion.hardcorePlus")}
                </SelectItem>
                <SelectItem value="SR">
                  {t("tools.emblem.bossCompletion.extremePlus")}
                </SelectItem>
                <SelectItem value="SSR">
                  {t("tools.emblem.bossCompletion.insanePlus")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {mode === "tower" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.tower.fields.boss")}</Label>

            <Select
              value={towerBossItemValue}
              onValueChange={handleSetTowerBossItem}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {TOWER_EMBLEM_BOSSES.map((boss) => (
                  <SelectItem key={boss.id} value={boss.name}>
                    {boss.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.tower.fields.defense")}</Label>

            <Select
              value={towerDefenseType}
              onValueChange={(v) =>
                setTowerDefenseType(v as TowerEmblemDefenseType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Light">
                  {t("tools.emblem.towerDefense.light")}
                </SelectItem>
                <SelectItem value="Heavy">
                  {t("tools.emblem.towerDefense.heavy")}
                </SelectItem>
                <SelectItem value="Unarmed">
                  {t("tools.emblem.towerDefense.unarmed")}
                </SelectItem>
                <SelectItem value="Elastic">
                  {t("tools.emblem.towerDefense.elastic")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.tower.fields.floor")}</Label>

            <Select
              value={String(towerFloor)}
              onValueChange={(v) =>
                setTowerFloor(Number.parseInt(v, 10) as 50 | 100)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {mode === "group" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.club.fields.school")}</Label>

            <Select
              value={groupSchool}
              onValueChange={(v) => handleSchoolChange(v as School)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {GROUP_EMBLEM_SCHOOLS.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {schoolNames[school.id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.club.fields.club")}</Label>

            <Select
              value={groupClub}
              onValueChange={(v) => setGroupClub(v as Club)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {clubs.map((club) => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>{t("tools.emblem.modes.club.fields.nameOverride")}</Label>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={groupNameOverrideStr}
                onChange={(e) => setGroupNameOverrideStr(e.target.value)}
              />

              <Button
                onClick={() => setGroupNameOverride(groupNameOverrideStr)}
              >
                {t("tools.emblem.update")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Separator />

      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <Button variant="outline" onClick={handleViewDefaultsClick}>
          {t("tools.emblem.default.button")}
        </Button>

        <div className="text-sm text-muted-foreground">
          {t.rich("tools.emblem.default.warning", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </div>
      </div>

      {defaultUrls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {defaultUrls.map((defaultUrl, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <img
                src={defaultUrl}
                alt={t("tools.emblem.defaultTitleAlt", { index: idx + 1 })}
                className="max-w-full"
              />

              <Input
                type="text"
                value={new URL(defaultUrl, window.location.href).toString()}
                readOnly
                onFocus={(e) => e.target.select()}
                className="w-9/10"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
