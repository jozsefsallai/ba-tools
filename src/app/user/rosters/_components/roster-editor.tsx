"use client";

import {
  type RosterItem,
  RosterItemEditor,
} from "@/app/user/rosters/_components/roster-item-editor";
import { MarkdownTips } from "@/components/common/markdown-tips";
import { MessageBox } from "@/components/common/message-box";
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
import { Textarea } from "@/components/ui/textarea";
import { useStudents } from "@/hooks/use-students";
import { useQueryWithStatus } from "@/lib/convex";
import {
  GAME_SERVER_NAMES,
  GAME_SERVERS,
  type StarLevel,
  type GameServer,
} from "@/lib/types";
import type { Student } from "~prisma";
import { useMutation } from "convex/react";
import { ChevronDownIcon, SaveIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type RosterEditorProps = {
  rosterId: Id<"roster">;
};

export function RosterEditor({ rosterId }: RosterEditorProps) {
  const { students } = useStudents();

  const query = useQueryWithStatus(api.roster.getOwnById, {
    id: rosterId,
  });

  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [accountLevel, setAccountLevel] = useState<number>(1);
  const [studentRep, setStudentRep] = useState<Student | null>(null);
  const [gameServer, setGameServer] = useState<GameServer>("JP");
  const [friendCode, setFriendCode] = useState("");
  const [rosterItems, setRosterItems] = useState<RosterItem[]>([]);

  const updateRosterItem = useCallback(
    (studentId: string, updatedItem: Partial<RosterItem>) => {
      setRosterItems((items) =>
        items.map((item) =>
          item.student.id === studentId ? { ...item, ...updatedItem } : item,
        ),
      );
    },
    [],
  );

  const filteredRosterItems = useMemo(() => {
    if (gameServer === "JP") {
      return rosterItems.filter((item) => item.student.isReleasedJP);
    }

    if (gameServer === "CN") {
      return rosterItems.filter((item) => item.student.isReleasedCN);
    }

    return rosterItems.filter((item) => item.student.isReleasedGlobal);
  }, [rosterItems, gameServer]);

  useEffect(() => {
    if (query.status !== "success" || !query.data) {
      return;
    }

    setName(query.data.name ?? "");
    setIntroduction(query.data.introduction ?? "");
    setVisibility(query.data.visibility);
    setAccountLevel(query.data.accountLevel);
    setGameServer(query.data.gameServer);
    setFriendCode(query.data.friendCode);

    if (query.data.studentRepId) {
      const rep =
        students.find((s) => s.id === query.data.studentRepId) ?? null;
      setStudentRep(rep);
    } else {
      setStudentRep(null);
    }

    setRosterItems(
      students
        .filter((student) => student.devName !== "CH0258_02") // tank b.hoshi
        .map((student) => {
          const item = query.data.students.find(
            (i) => i.studentId === student.id,
          );

          return {
            enabled: !!item,
            student,
            starLevel: item?.starLevel ?? (student.rarity as StarLevel),
            ueLevel: item?.ueLevel ?? 1,
            level: item?.level ?? 1,
            relationshipRank: item?.relationshipRank ?? 1,
            ex: item?.ex ?? 1,
            basic: item?.basic ?? 1,
            enhanced: item?.enhanced ?? 1,
            sub: item?.sub ?? 1,
            equipmentSlot1: item?.equipmentSlot1 ?? 0,
            equipmentSlot2: item?.equipmentSlot2 ?? 0,
            equipmentSlot3: item?.equipmentSlot3 ?? 0,
            equipmentSlot4: item?.equipmentSlot4 ?? 0,
            attackLevel: item?.attackLevel ?? 0,
            hpLevel: item?.hpLevel ?? 0,
            healLevel: item?.healLevel ?? 0,
            featuredBorrowSlot: item?.featuredBorrowSlot ?? null,
          };
        }),
    );
  }, [students, rosterId, query.status]);

  const updateMutation = useMutation(api.roster.update);

  async function handleWantsToUpdate() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    const studentRepId = studentRep ? studentRep.id : undefined;

    const students = rosterItems
      .filter((item) => item.enabled)
      .map((item) => ({
        studentId: item.student.id,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel ?? undefined,
        level: item.level,
        relationshipRank: item.relationshipRank,
        ex: item.ex,
        basic: item.basic,
        enhanced: item.enhanced,
        sub: item.sub,
        equipmentSlot1: item.equipmentSlot1,
        equipmentSlot2: item.equipmentSlot2,
        equipmentSlot3: item.equipmentSlot3,
        equipmentSlot4: item.equipmentSlot4,
        attackLevel: item.attackLevel,
        hpLevel: item.hpLevel,
        healLevel: item.healLevel,
        featuredBorrowSlot: item.featuredBorrowSlot ?? undefined,
      }));

    try {
      await updateMutation({
        id: rosterId,
        name,
        introduction,
        visibility,
        accountLevel,
        studentRepId,
        gameServer,
        friendCode,
        students,
      });

      toast.success("Roster updated successfully!");
    } catch (err) {
      console.error("Failed to update roster", err);
      toast.error("Failed to update roster. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (query.status === "pending") {
    return <MessageBox>Loading...</MessageBox>;
  }

  if (query.status === "error" || !query.data) {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load roster.
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Edit Roster</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            In-Game Nickname{" "}
            <small className="text-muted-foreground text-xs">(optional)</small>
          </Label>

          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Joe"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="introduction">
            Introduction
            <small className="text-muted-foreground text-xs">
              (optional, supports Markdown)
            </small>
          </Label>

          <Textarea
            id="introduction"
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            placeholder="Hello."
            className="resize-none min-h-24"
          />

          <MarkdownTips />
        </div>

        <div className="flex gap-2 items-center">
          <Label>Visibility</Label>

          <Select
            value={visibility}
            onValueChange={(val) => setVisibility(val as "public" | "private")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="accountLevel">Account Level</Label>

          <Input
            id="accountLevel"
            type="number"
            min={1}
            max={90}
            value={accountLevel}
            onChange={(e) => setAccountLevel(Number(e.target.value))}
            placeholder="1"
          />
        </div>

        <div className="flex gap-2">
          <Label htmlFor="studentRep">Student Representative</Label>

          <div>
            <StudentPicker
              onStudentSelected={(student) => setStudentRep(student)}
              className="w-[200px] md:w-[350px]"
            >
              <Button variant="outline">
                {studentRep ? studentRep.name : "Select a student"}
                <ChevronDownIcon />
              </Button>
            </StudentPicker>
          </div>

          {studentRep && (
            <Button variant="outline" onClick={() => setStudentRep(null)}>
              <XIcon />
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gameServer">Game Server</Label>

          <Select
            value={gameServer}
            onValueChange={(val) => setGameServer(val as GameServer)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GAME_SERVERS.map((server) => (
                <SelectItem key={server} value={server}>
                  {GAME_SERVER_NAMES[server]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="friendCode">Friend Code</Label>

          <Input
            id="friendCode"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            placeholder="ABCDEFGH"
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRosterItems.map((rosterItem) => (
          <RosterItemEditor
            key={rosterItem.student.id}
            gameServer={gameServer}
            rosterItem={rosterItem}
            updateRosterItem={updateRosterItem}
          />
        ))}
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
