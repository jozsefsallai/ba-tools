"use client";

import { RosterItem } from "@/app/rosters/[gameServer]/[friendCode]/_components/roster-item";
import type {
  RosterStudentsSortOption,
  RosterStudentData,
} from "@/app/rosters/[gameServer]/[friendCode]/types";
import { MessageBox } from "@/components/common/message-box";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { useStudents } from "@/hooks/use-students";
import { useQueryWithStatus } from "@/lib/convex";
import {
  GAME_SERVER_NAMES,
  type StarLevel,
  type UELevel,
  type GameServer,
  type Student,
  type BorrowSlotGameMode,
} from "@/lib/types";
import { buildStudentPortraitUrl } from "@/lib/url";
import { AccordionContent } from "@radix-ui/react-accordion";
import { format } from "date-fns";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { api } from "~convex/api";

export type RosterViewProps = {
  gameServer: GameServer;
  friendCode: string;
};

export function RosterView({ gameServer, friendCode }: RosterViewProps) {
  const { students } = useStudents();

  const query = useQueryWithStatus(api.roster.getByGameServerAndFriendCode, {
    gameServer,
    friendCode,
  });

  const [copied, setCopied] = useState(false);

  // filters
  const [name, setName] = useState("");

  const [minStarLevel, setMinStarLevel] = useState<StarLevel | undefined>(
    undefined,
  );
  const [minUELevel, setMinUELevel] = useState<UELevel | undefined>(undefined);

  const [minLevel, setMinLevel] = useState<number | undefined>(undefined);
  const [maxLevel, setMaxLevel] = useState<number | undefined>(undefined);

  const [minRelationshipRank, setMinRelationshipRank] = useState<
    number | undefined
  >(undefined);

  const [minAtkTalent, setMinAtkTalent] = useState<number | undefined>(
    undefined,
  );
  const [minHpTalent, setMinHpTalent] = useState<number | undefined>(undefined);
  const [minHealTalent, setMinHealTalent] = useState<number | undefined>(
    undefined,
  );

  const [minGear1Tier, setMinGear1Tier] = useState<number | undefined>(
    undefined,
  );
  const [minGear2Tier, setMinGear2Tier] = useState<number | undefined>(
    undefined,
  );
  const [minGear3Tier, setMinGear3Tier] = useState<number | undefined>(
    undefined,
  );
  const [minGear4Tier, setMinGear4Tier] = useState<number | undefined>(
    undefined,
  );

  const [sortOption, setSortOption] =
    useState<RosterStudentsSortOption>("default");

  const studentMap = useMemo(() => {
    const map: Record<string, Student> = {};

    for (const student of students) {
      map[student.id] = student;
    }

    return map;
  }, [students]);

  const studentRep = useMemo(() => {
    if (query.status !== "success" || !query.data || !query.data.studentRepId) {
      return undefined;
    }

    return studentMap[query.data.studentRepId];
  }, [query.status, studentMap]);

  const rosterStudents = useMemo<RosterStudentData[]>(() => {
    if (query.status !== "success" || !query.data) {
      return [];
    }

    return query.data.students
      .map((rs) => ({
        ...rs,
        student: studentMap[rs.studentId],
      }))
      .filter((rs) => rs.student !== undefined);
  }, [query.status, studentMap]);

  const filteredRosterStudents = useMemo(() => {
    return rosterStudents.filter((rs) => {
      if (name && !rs.student.name.toLowerCase().includes(name.toLowerCase())) {
        return false;
      }

      if (
        typeof minUELevel === "undefined" &&
        typeof minStarLevel !== "undefined" &&
        rs.starLevel < minStarLevel
      ) {
        return false;
      }

      if (
        typeof minUELevel !== "undefined" &&
        (!rs.ueLevel || rs.ueLevel < minUELevel)
      ) {
        return false;
      }

      if (minLevel !== undefined && rs.level < minLevel) {
        return false;
      }

      if (maxLevel !== undefined && rs.level > maxLevel) {
        return false;
      }

      if (
        minRelationshipRank !== undefined &&
        rs.relationshipRank < minRelationshipRank
      ) {
        return false;
      }

      if (
        minAtkTalent !== undefined &&
        (!rs.attackLevel || rs.attackLevel < minAtkTalent)
      ) {
        return false;
      }

      if (
        minHpTalent !== undefined &&
        (!rs.hpLevel || rs.hpLevel < minHpTalent)
      ) {
        return false;
      }

      if (
        minHealTalent !== undefined &&
        (!rs.healLevel || rs.healLevel < minHealTalent)
      ) {
        return false;
      }

      if (
        minGear1Tier !== undefined &&
        (!rs.equipmentSlot1 || rs.equipmentSlot1 < minGear1Tier)
      ) {
        return false;
      }

      if (
        minGear2Tier !== undefined &&
        (!rs.equipmentSlot2 || rs.equipmentSlot2 < minGear2Tier)
      ) {
        return false;
      }

      if (
        minGear3Tier !== undefined &&
        (!rs.equipmentSlot3 || rs.equipmentSlot3 < minGear3Tier)
      ) {
        return false;
      }

      if (
        minGear4Tier !== undefined &&
        (!rs.equipmentSlot4 || rs.equipmentSlot4 < minGear4Tier)
      ) {
        return false;
      }

      return true;
    });
  }, [
    rosterStudents,
    name,
    minStarLevel,
    minUELevel,
    minLevel,
    maxLevel,
    minRelationshipRank,
    minAtkTalent,
    minHpTalent,
    minHealTalent,
    minGear1Tier,
    minGear2Tier,
    minGear3Tier,
    minGear4Tier,
  ]);

  const sortedAndFilteredRosterStudents = useMemo(() => {
    if (sortOption === "default") {
      return filteredRosterStudents;
    }

    const students = [...filteredRosterStudents];

    switch (sortOption) {
      case "nameAsc":
        students.sort((a, b) => a.student.name.localeCompare(b.student.name));
        break;
      case "nameDesc":
        students.sort((a, b) => b.student.name.localeCompare(a.student.name));
        break;
      case "levelAsc":
        students.sort((a, b) => a.level - b.level);
        break;
      case "levelDesc":
        students.sort((a, b) => b.level - a.level);
        break;
      case "relationshipRankAsc":
        students.sort((a, b) => a.relationshipRank - b.relationshipRank);
        break;
      case "relationshipRankDesc":
        students.sort((a, b) => b.relationshipRank - a.relationshipRank);
        break;
      case "atkTalentAsc":
        students.sort((a, b) => (a.attackLevel ?? 0) - (b.attackLevel ?? 0));
        break;
      case "atkTalentDesc":
        students.sort((a, b) => (b.attackLevel ?? 0) - (a.attackLevel ?? 0));
        break;
      case "hpTalentAsc":
        students.sort((a, b) => (a.hpLevel ?? 0) - (b.hpLevel ?? 0));
        break;
      case "hpTalentDesc":
        students.sort((a, b) => (b.hpLevel ?? 0) - (a.hpLevel ?? 0));
        break;
      case "healTalentAsc":
        students.sort((a, b) => (a.healLevel ?? 0) - (b.healLevel ?? 0));
        break;
      case "healTalentDesc":
        students.sort((a, b) => (b.healLevel ?? 0) - (a.healLevel ?? 0));
        break;
    }

    return students;
  }, [filteredRosterStudents, sortOption]);

  const featuredStudents = useMemo<
    Record<BorrowSlotGameMode, RosterStudentData[]>
  >(() => {
    const featured: Record<BorrowSlotGameMode, RosterStudentData[]> = {
      raid: rosterStudents.filter((rs) => rs.featuredBorrowSlot === "raid"),
      jfd: rosterStudents.filter((rs) => rs.featuredBorrowSlot === "jfd"),
      conquest: rosterStudents.filter(
        (rs) => rs.featuredBorrowSlot === "conquest",
      ),
      tower: rosterStudents.filter((rs) => rs.featuredBorrowSlot === "tower"),
    };

    return featured;
  }, [rosterStudents]);

  async function copyFriendCodeToClipboard() {
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy friend code to clipboard");
    }
  }

  const handleNameFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    [],
  );

  const handleMinStarLevelFilterChange = useCallback(
    (level: StarLevel | undefined) => {
      setMinStarLevel(level);
    },
    [],
  );

  const handleMinUELevelFilterChange = useCallback(
    (level: UELevel | undefined) => {
      setMinUELevel(level);
    },
    [],
  );

  const handleMinLevelFilterChange = useCallback((val: string) => {
    if (!val) {
      setMinLevel(undefined);
      return;
    }

    const level = Number.parseInt(val);
    if (Number.isNaN(level)) {
      return;
    }

    setMinLevel(level);
  }, []);

  const handleMaxLevelFilterChange = useCallback((val: string) => {
    if (!val) {
      setMaxLevel(undefined);
      return;
    }

    const level = Number.parseInt(val);
    if (Number.isNaN(level)) {
      return;
    }

    setMaxLevel(level);
  }, []);

  const handleMinRelationshipRankFilterChange = useCallback((val: string) => {
    if (!val) {
      setMinRelationshipRank(undefined);
      return;
    }

    const rank = Number.parseInt(val);
    if (Number.isNaN(rank)) {
      return;
    }

    setMinRelationshipRank(rank);
  }, []);

  const handleMinAtkTalentFilterChange = useCallback((val: string) => {
    if (!val) {
      setMinAtkTalent(undefined);
      return;
    }

    const level = Number.parseInt(val);
    if (Number.isNaN(level)) {
      return;
    }

    setMinAtkTalent(level);
  }, []);

  const handleMinHpTalentFilterChange = useCallback((val: string) => {
    if (!val) {
      setMinHpTalent(undefined);
      return;
    }

    const level = Number.parseInt(val);
    if (Number.isNaN(level)) {
      return;
    }

    setMinHpTalent(level);
  }, []);

  const handleMinHealTalentFilterChange = useCallback((val: string) => {
    if (!val) {
      setMinHealTalent(undefined);
      return;
    }

    const level = Number.parseInt(val);
    if (Number.isNaN(level)) {
      return;
    }

    setMinHealTalent(level);
  }, []);

  const handleMinGear1TierFilterChange = useCallback((val: string) => {
    if (!val) {
      setMinGear1Tier(undefined);
      return;
    }

    const tier = Number.parseInt(val);
    if (Number.isNaN(tier)) {
      return;
    }

    setMinGear1Tier(tier);
  }, []);

  const handleMinGear2TierFilterChange = useCallback((val: string) => {
    if (!val) {
      setMinGear2Tier(undefined);
      return;
    }

    const tier = Number.parseInt(val);
    if (Number.isNaN(tier)) {
      return;
    }

    setMinGear2Tier(tier);
  }, []);

  const handleMinGear3TierFilterChange = useCallback((val: string) => {
    if (!val) {
      setMinGear3Tier(undefined);
      return;
    }

    const tier = Number.parseInt(val);
    if (Number.isNaN(tier)) {
      return;
    }

    setMinGear3Tier(tier);
  }, []);

  const handleMinGear4TierFilterChange = useCallback((val: string) => {
    if (!val) {
      setMinGear4Tier(undefined);
      return;
    }

    const tier = Number.parseInt(val);
    if (Number.isNaN(tier)) {
      return;
    }

    setMinGear4Tier(tier);
  }, []);

  if (query.status === "pending") {
    return <MessageBox>Loading roster...</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load roster.
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex items-start gap-4">
          {studentRep && (
            <img
              src={buildStudentPortraitUrl(studentRep)}
              alt={studentRep.name}
              className="w-32 shrink-0"
            />
          )}

          <div className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold font-nexon-football-gothic italic">
                {query.data.name ?? query.data.friendCode}
              </h1>

              <div className="flex gap-2 items-center">
                <Badge
                  className="cursor-pointer"
                  onClick={copyFriendCodeToClipboard}
                >
                  {query.data.friendCode}{" "}
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Badge>

                <Badge variant="secondary">
                  {GAME_SERVER_NAMES[query.data.gameServer]}
                </Badge>

                <Badge variant="outline">Lv.{query.data.accountLevel}</Badge>
              </div>
            </div>

            {query.data.introduction && (
              <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:mt-4 max-w-none">
                <Markdown>{query.data.introduction}</Markdown>
              </div>
            )}

            <Separator />

            <div className="text-xs text-muted-foreground">
              <strong>Last updated:</strong>{" "}
              {format(new Date(query.data.lastUpdated), "PPP")}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold">Roster</h2>

        <Card className="py-0">
          <CardContent>
            <Accordion type="multiple">
              <AccordionItem value="filters">
                <AccordionTrigger>Filters</AccordionTrigger>

                <AccordionContent className="pt-2 pb-6">
                  <div className="flex flex-col gap-4">
                    <Input
                      id="filter-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Search by name..."
                    />

                    <div className="grid grid-cols-5 gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min Star Level:</Label>

                        <Select
                          value={minStarLevel?.toString() ?? ""}
                          onValueChange={(value) =>
                            handleMinStarLevelFilterChange(
                              value === "_"
                                ? undefined
                                : (Number.parseInt(value) as StarLevel),
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            {minStarLevel ? <SelectValue /> : "Any"}
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min UE Level:</Label>

                        <Select
                          value={minUELevel?.toString() ?? ""}
                          onValueChange={(value) =>
                            handleMinUELevelFilterChange(
                              value === "_"
                                ? undefined
                                : (Number.parseInt(value) as UELevel),
                            )
                          }
                        >
                          <SelectTrigger className="w-full h-auto">
                            {minUELevel ? <SelectValue /> : "Any"}
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="_">Any</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min Level:</Label>

                        <Input
                          type="number"
                          min={1}
                          max={90}
                          value={minLevel ?? ""}
                          onChange={(e) =>
                            handleMinLevelFilterChange(e.target.value)
                          }
                          placeholder="Any"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Max Level:</Label>

                        <Input
                          type="number"
                          min={1}
                          max={90}
                          value={maxLevel ?? ""}
                          onChange={(e) =>
                            handleMaxLevelFilterChange(e.target.value)
                          }
                          placeholder="Any"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">
                          Min Relationship Rank:
                        </Label>

                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={minRelationshipRank ?? ""}
                          onChange={(e) =>
                            handleMinRelationshipRankFilterChange(
                              e.target.value,
                            )
                          }
                          placeholder="Any"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min Attack Talent:</Label>

                        <Input
                          type="number"
                          min={1}
                          max={25}
                          value={minAtkTalent ?? ""}
                          onChange={(e) =>
                            handleMinAtkTalentFilterChange(e.target.value)
                          }
                          placeholder="Any"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min HP Talent:</Label>

                        <Input
                          type="number"
                          min={1}
                          max={25}
                          value={minHpTalent ?? ""}
                          onChange={(e) =>
                            handleMinHpTalentFilterChange(e.target.value)
                          }
                          placeholder="Any"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min Healing Talent:</Label>

                        <Input
                          type="number"
                          min={1}
                          max={25}
                          value={minHealTalent ?? ""}
                          onChange={(e) =>
                            handleMinHealTalentFilterChange(e.target.value)
                          }
                          placeholder="Any"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min Gear 1 Tier:</Label>

                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={minGear1Tier ?? ""}
                          onChange={(e) =>
                            handleMinGear1TierFilterChange(e.target.value)
                          }
                          placeholder="Any"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min Gear 2 Tier:</Label>

                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={minGear2Tier ?? ""}
                          onChange={(e) =>
                            handleMinGear2TierFilterChange(e.target.value)
                          }
                          placeholder="Any"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min Gear 3 Tier:</Label>

                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={minGear3Tier ?? ""}
                          onChange={(e) =>
                            handleMinGear3TierFilterChange(e.target.value)
                          }
                          placeholder="Any"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Min Bond Gear Tier:</Label>

                        <Input
                          type="number"
                          min={1}
                          max={2}
                          value={minGear4Tier ?? ""}
                          onChange={(e) =>
                            handleMinGear4TierFilterChange(e.target.value)
                          }
                          placeholder="Any"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sort">
                <AccordionTrigger>Sort</AccordionTrigger>

                <AccordionContent className="pt-2 pb-6">
                  <Select
                    value={sortOption}
                    onValueChange={(value) =>
                      setSortOption(value as RosterStudentsSortOption)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="nameAsc">Name (asc)</SelectItem>
                      <SelectItem value="nameDesc">Name (desc)</SelectItem>
                      <SelectItem value="levelAsc">Level (asc)</SelectItem>
                      <SelectItem value="levelDesc">Level (desc)</SelectItem>
                      <SelectItem value="relationshipRankAsc">
                        Relationship Rank (asc)
                      </SelectItem>
                      <SelectItem value="relationshipRankDesc">
                        Relationship Rank (desc)
                      </SelectItem>
                      <SelectItem value="atkTalentAsc">
                        Attack Talent (asc)
                      </SelectItem>
                      <SelectItem value="atkTalentDesc">
                        Attack Talent (desc)
                      </SelectItem>
                      <SelectItem value="hpTalentAsc">
                        HP Talent (asc)
                      </SelectItem>
                      <SelectItem value="hpTalentDesc">
                        HP Talent (desc)
                      </SelectItem>
                      <SelectItem value="healTalentAsc">
                        Healing Talent (asc)
                      </SelectItem>
                      <SelectItem value="healTalentDesc">
                        Healing Talent (desc)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFilteredRosterStudents.map((item) => (
            <RosterItem key={item.studentId} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
