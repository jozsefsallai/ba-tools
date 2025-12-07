"use client";

import { PVPMatchFormationEditor } from "@/app/pvp/_components/pvp-match-formation-editor";
import type {
  PVPFormationStudentItem,
  PVPMatchResult,
  PVPMatchType,
} from "@/app/pvp/_lib/types";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useStudents } from "@/hooks/use-students";
import type { Student } from "~prisma";
import { useMutation } from "convex/react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

export type PVPMatchEditor = {
  seasonId: Id<"pvpSeason">;
  current?: Doc<"pvpMatchRecord">;
};

export function PVPMatchEditor({ seasonId, current }: PVPMatchEditor) {
  const { studentMap } = useStudents();

  const router = useRouter();

  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [date, setDate] = useState<Date>(new Date());
  const [ownRank, setOwnRank] = useState<number | undefined>();
  const [ownRankStr, setOwnRankStr] = useState<string>("");
  const [opponentName, setOpponentName] = useState<string>("");
  const [opponentRank, setOpponentRank] = useState<number | undefined>();
  const [opponentRankStr, setOpponentRankStr] = useState<string>("");
  const [opponentStudentRep, setOpponentStudentRep] = useState<
    Student | undefined
  >();
  const [matchType, setMatchType] = useState<PVPMatchType>("attack");

  const [ownTeam, setOwnTeam] = useState<PVPFormationStudentItem[]>([
    {},
    {},
    {},
    {},
    {},
    {},
  ]);

  const [opponentTeam, setOpponentTeam] = useState<PVPFormationStudentItem[]>([
    {},
    {},
    {},
    {},
    {},
    {},
  ]);

  const [result, setResult] = useState<PVPMatchResult>("win");
  const [videoUrl, setVideoUrl] = useState<string>("");

  const recordMatchMutation = useMutation(api.pvp.recordMatch);
  const updateMatchMutation = useMutation(api.pvp.updateMatch);

  const [isSaving, setIsSaving] = useState(false);

  const handleItemUpdate = useCallback(
    (
      kind: "own" | "enemy",
      idx: number,
      params: Partial<PVPFormationStudentItem>,
    ) => {
      const targetTeam = kind === "own" ? ownTeam : opponentTeam;
      const updatedItem = {
        ...targetTeam[idx],
        ...params,
      };

      const updatedTeam = [...targetTeam];
      updatedTeam[idx] = updatedItem;

      if (kind === "own") {
        setOwnTeam(updatedTeam);
      } else {
        setOpponentTeam(updatedTeam);
      }
    },
    [ownTeam, opponentTeam],
  );

  const handleOwnItemUpdate = useCallback(
    (idx: number, params: Partial<PVPFormationStudentItem>) => {
      handleItemUpdate("own", idx, params);
    },
    [handleItemUpdate],
  );

  const handleOpponentItemUpdate = useCallback(
    (idx: number, params: Partial<PVPFormationStudentItem>) => {
      handleItemUpdate("enemy", idx, params);
    },
    [handleItemUpdate],
  );

  const handleItemMoveUp = useCallback(
    (kind: "own" | "enemy", idx: number) => {
      const targetTeam = kind === "own" ? ownTeam : opponentTeam;
      if (idx <= 0 || idx >= targetTeam.length) {
        return;
      }

      const updatedTeam = [...targetTeam];
      const temp = updatedTeam[idx - 1];
      updatedTeam[idx - 1] = updatedTeam[idx];
      updatedTeam[idx] = temp;

      if (kind === "own") {
        setOwnTeam(updatedTeam);
      } else {
        setOpponentTeam(updatedTeam);
      }
    },
    [ownTeam, opponentTeam],
  );

  const handleItemMoveDown = useCallback(
    (kind: "own" | "enemy", idx: number) => {
      const targetTeam = kind === "own" ? ownTeam : opponentTeam;
      if (idx < 0 || idx >= targetTeam.length - 1) {
        return;
      }

      const updatedTeam = [...targetTeam];
      const temp = updatedTeam[idx + 1];
      updatedTeam[idx + 1] = updatedTeam[idx];
      updatedTeam[idx] = temp;

      if (kind === "own") {
        setOwnTeam(updatedTeam);
      } else {
        setOpponentTeam(updatedTeam);
      }
    },
    [ownTeam, opponentTeam],
  );

  const handleOwnItemMoveUp = useCallback(
    (idx: number) => {
      handleItemMoveUp("own", idx);
    },
    [handleItemMoveUp],
  );

  const handleOwnItemMoveDown = useCallback(
    (idx: number) => {
      handleItemMoveDown("own", idx);
    },
    [handleItemMoveDown],
  );

  const handleOpponentItemMoveUp = useCallback(
    (idx: number) => {
      handleItemMoveUp("enemy", idx);
    },
    [handleItemMoveUp],
  );

  const handleOpponentItemMoveDown = useCallback(
    (idx: number) => {
      handleItemMoveDown("enemy", idx);
    },
    [handleItemMoveDown],
  );

  async function handleWantsToUpdate() {
    setIsSaving(true);

    const matchData = {
      date: date.getTime(),
      ownRank,
      opponentName,
      opponentRank,
      opponentStudentRepId: opponentStudentRep
        ? opponentStudentRep.id
        : undefined,
      matchType,
      ownTeam: ownTeam.map((item) => ({
        studentId: item.student ? item.student.id : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
      opponentTeam: opponentTeam.map((item) => ({
        studentId: item.student ? item.student.id : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
      result,
      videoUrl: videoUrl.trim() === "" ? undefined : videoUrl.trim(),
    };

    try {
      if (current) {
        await updateMatchMutation({
          matchId: current._id,
          ...matchData,
        });

        toast.success("Match updated successfully.");
      } else {
        await recordMatchMutation({
          seasonId,
          ...matchData,
        });

        toast.success("Match recorded successfully.");
        router.push(`/pvp/${seasonId}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save match. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!current) {
      return;
    }

    setDate(new Date(current.date));
    setOwnRank(current.ownRank);
    setOwnRankStr(current.ownRank?.toString() ?? "");
    setOpponentName(current.opponentName ?? "");
    setOpponentRank(current.opponentRank);
    setOpponentRankStr(current.opponentRank?.toString() ?? "");

    if (current.opponentStudentRepId) {
      const student = studentMap[current.opponentStudentRepId];
      if (student) {
        setOpponentStudentRep(student);
      }
    }

    setMatchType(current.matchType);

    setOwnTeam(
      current.ownTeam.map((item) => ({
        student: item.studentId ? studentMap[item.studentId] : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
    );

    setOpponentTeam(
      current.opponentTeam.map((item) => ({
        student: item.studentId ? studentMap[item.studentId] : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
    );

    setResult(current.result);
    setVideoUrl(current.videoUrl ?? "");
  }, [current, studentMap]);

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pvp/${seasonId}`}>
              <ChevronLeftIcon />
            </Link>
          </Button>

          <h1 className="text-xl font-bold">
            {current ? "Edit Match" : "Record New Match"}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="flex flex-col gap-1">
          <Label htmlFor="match-date" className="text-xs">
            Date
          </Label>

          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="match-date"
                className="justify-between"
              >
                {date.toLocaleDateString()} <ChevronDownIcon />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={date}
                captionLayout="dropdown"
                onSelect={(date) => {
                  setDate(date ?? new Date());
                  setDatePopoverOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Video URL</Label>

          <Input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://... (optional)"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Match type</Label>

          <Select
            value={matchType}
            onValueChange={(value) => setMatchType(value as PVPMatchType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="attack">Attack</SelectItem>
              <SelectItem value="defense">Defense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Result</Label>

          <Select
            value={result}
            onValueChange={(value) => setResult(value as PVPMatchResult)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="win">Win</SelectItem>
              <SelectItem value="loss">Loss</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>You</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1">
                <Label htmlFor="own-rank" className="text-xs">
                  Your Rank
                </Label>

                <Input
                  id="own-rank"
                  type="number"
                  min={1}
                  value={ownRankStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOwnRankStr(val);

                    if (val === "") {
                      setOwnRank(undefined);
                      return;
                    }

                    const num = Number.parseInt(val, 10);
                    if (!Number.isNaN(num)) {
                      setOwnRank(num);
                    } else {
                      setOwnRank(undefined);
                    }
                  }}
                />
              </div>
            </div>

            <Separator />

            <PVPMatchFormationEditor
              formation={ownTeam}
              onUpdate={handleOwnItemUpdate}
              onMoveUp={handleOwnItemMoveUp}
              onMoveDown={handleOwnItemMoveDown}
              strikerPrefix={matchType === "attack" ? "A" : "D"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opponent</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="opponent-name" className="text-xs">
                  Opponent Name
                </Label>

                <Input
                  id="opponent-name"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="opponent-rank" className="text-xs">
                  Opponent Rank
                </Label>

                <Input
                  id="opponent-rank"
                  type="number"
                  min={1}
                  value={opponentRankStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOpponentRankStr(val);

                    if (val === "") {
                      setOpponentRank(undefined);
                      return;
                    }

                    const num = Number.parseInt(val, 10);
                    if (!Number.isNaN(num)) {
                      setOpponentRank(num);
                    } else {
                      setOpponentRank(undefined);
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="opponent-student-rep" className="text-xs">
                  Opponent Student Rep
                </Label>

                <div className="flex gap-1">
                  <StudentPicker onStudentSelected={setOpponentStudentRep}>
                    <Button
                      variant="outline"
                      className="flex-1 justify-between"
                    >
                      {opponentStudentRep
                        ? opponentStudentRep.name
                        : "Select Student"}
                      <ChevronDownIcon />
                    </Button>
                  </StudentPicker>

                  {opponentStudentRep && (
                    <Button
                      variant="outline"
                      onClick={() => setOpponentStudentRep(undefined)}
                    >
                      <XIcon />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <PVPMatchFormationEditor
              formation={opponentTeam}
              onUpdate={handleOpponentItemUpdate}
              onMoveUp={handleOpponentItemMoveUp}
              onMoveDown={handleOpponentItemMoveDown}
              strikerPrefix={matchType === "defense" ? "A" : "D"}
            />
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent z-50 p-4 pt-8 flex justify-center">
        <Button onClick={handleWantsToUpdate} disabled={isSaving}>
          <SaveIcon />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
