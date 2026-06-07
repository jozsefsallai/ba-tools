"use client";

import type { RosterItem } from "@/app/user/rosters/_components/roster-item-editor";
import { RosterItemsGrid } from "@/app/user/rosters/_components/roster-items-grid";
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
import { revalidateRosterPublicCache } from "@/lib/cache";
import { useQueryWithStatus } from "@/lib/convex";
import {
  GAME_SERVERS,
  GAME_SERVER_NAMES,
  type GameServer,
  type StarLevel,
} from "@/lib/types";
import { useMutation } from "convex/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";
import type { Student } from "~prisma";

export type RosterEditorProps = {
  rosterId: Id<"roster">;
};

function isReleasedOnServer(student: Student, gameServer: GameServer): boolean {
  if (gameServer === "JP") {
    return student.isReleasedJP;
  }

  if (gameServer === "CN") {
    return student.isReleasedCN;
  }

  return student.isReleasedGlobal;
}

function createRosterItem(
  student: Student,
  savedItem?: Doc<"roster">["students"][number],
): RosterItem {
  return {
    student,
    starLevel: savedItem?.starLevel ?? (student.rarity as StarLevel),
    ueLevel: savedItem?.ueLevel ?? 1,
    level: savedItem?.level ?? 1,
    relationshipRank: savedItem?.relationshipRank ?? 1,
    ex: savedItem?.ex ?? 1,
    basic: savedItem?.basic ?? 1,
    enhanced: savedItem?.enhanced ?? 1,
    sub: savedItem?.sub ?? 1,
    equipmentSlot1: savedItem?.equipmentSlot1 ?? 0,
    equipmentSlot2: savedItem?.equipmentSlot2 ?? 0,
    equipmentSlot3: savedItem?.equipmentSlot3 ?? 0,
    equipmentSlot4: savedItem?.equipmentSlot4 ?? 0,
    attackLevel: savedItem?.attackLevel ?? 0,
    hpLevel: savedItem?.hpLevel ?? 0,
    healLevel: savedItem?.healLevel ?? 0,
    featuredBorrowSlot: savedItem?.featuredBorrowSlot ?? null,
  };
}

export function RosterEditor({ rosterId }: RosterEditorProps) {
  const t = useTranslations();
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
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const publicRosterPath = useMemo(() => {
    const code = friendCode.trim();

    if (!code) {
      return null;
    }

    return `/rosters/${gameServer}/${code}`;
  }, [gameServer, friendCode]);

  const canCopyShareLink = publicRosterPath !== null && visibility === "public";

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

  const addStudent = useCallback((student: Student) => {
    setRosterItems((items) => {
      if (items.some((item) => item.student.id === student.id)) {
        return items;
      }

      return [...items, createRosterItem(student)];
    });
  }, []);

  const removeStudent = useCallback((studentId: string) => {
    setRosterItems((items) =>
      items.filter((item) => item.student.id !== studentId),
    );
  }, []);

  const reorderRosterItems = useCallback((items: RosterItem[]) => {
    setRosterItems(items);
  }, []);

  const filteredRosterItems = useMemo(() => {
    return rosterItems.filter((item) =>
      isReleasedOnServer(item.student, gameServer),
    );
  }, [rosterItems, gameServer]);

  const hiddenNotReleasedCount =
    rosterItems.length - filteredRosterItems.length;

  const addableStudents = useMemo(() => {
    const rosterStudentIds = new Set(
      rosterItems.map((item) => item.student.id),
    );

    return students.filter(
      (student) =>
        student.devName !== "CH0258_02" &&
        isReleasedOnServer(student, gameServer) &&
        !rosterStudentIds.has(student.id),
    );
  }, [students, rosterItems, gameServer]);

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
      query.data.students
        .map((item) => {
          const student = students.find((s) => s.id === item.studentId);

          if (!student || student.devName === "CH0258_02") {
            return null;
          }

          return createRosterItem(student, item);
        })
        .filter((item): item is RosterItem => item !== null),
    );
  }, [students, rosterId, query.status, query.data]);

  const updateMutation = useMutation(api.roster.update);

  async function handleCopyShareLink() {
    if (!canCopyShareLink || !publicRosterPath || copiedShareLink) {
      return;
    }

    try {
      const url = new URL(publicRosterPath, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCopiedShareLink(true);
      toast.success(t("tools.roster.editor.toasts.shareLinkCopied"));

      setTimeout(() => {
        setCopiedShareLink(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      toast.error(t("tools.roster.editor.toasts.shareLinkCopyFailed"));
    }
  }

  async function handleWantsToUpdate() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    const studentRepId = studentRep ? studentRep.id : undefined;

    const studentsToSave = rosterItems.map((item) => ({
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
      const previousRoster = query.data
        ? {
            gameServer: query.data.gameServer,
            friendCode: query.data.friendCode,
          }
        : undefined;

      await updateMutation({
        id: rosterId,
        name,
        introduction,
        visibility,
        accountLevel,
        studentRepId,
        gameServer,
        friendCode,
        students: studentsToSave,
      });

      await revalidateRosterPublicCache(gameServer, friendCode, previousRoster);

      toast.success(t("tools.roster.editor.toasts.success"));
    } catch (err) {
      console.error("Failed to update roster", err);
      toast.error(t("tools.roster.editor.toasts.fail"));
    } finally {
      setIsSaving(false);
    }
  }

  if (query.status === "pending") {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (query.status === "error" || !query.data) {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("tools.roster.editor.failedToLoad")}
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">{t("tools.roster.editor.title")}</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            {t("common.inGameNickname")}{" "}
            <small className="text-muted-foreground text-xs">
              {t("common.optional")}
            </small>
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
            {t("common.introduction")}
            <small className="text-muted-foreground text-xs">
              {t("common.optionalSupportsMarkdown")}
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
          <Label className="shrink-0">{t("common.visibility")}</Label>

          <Select
            value={visibility}
            onValueChange={(val) => setVisibility(val as "public" | "private")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">{t("common.private")}</SelectItem>
              <SelectItem value="public">{t("common.public")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="accountLevel">{t("common.accountLevel")}</Label>

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
          <Label className="shrink-0" htmlFor="studentRep">
            {t("common.studentRep")}
          </Label>

          <div>
            <StudentPicker
              onStudentSelected={(student) => setStudentRep(student)}
              className="w-[200px] md:w-[350px]"
            >
              <Button variant="outline">
                {studentRep ? studentRep.name : t("common.selectStudent")}
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
          <Label htmlFor="gameServer">{t("common.gameServer")}</Label>

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
          <Label htmlFor="friendCode">{t("common.friendCode")}</Label>

          <Input
            id="friendCode"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            placeholder="ABCDEFGH"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!publicRosterPath}
            onClick={() => {
              if (publicRosterPath) {
                window.open(publicRosterPath, "_blank", "noopener,noreferrer");
              }
            }}
          >
            <ExternalLinkIcon />
            {t("tools.roster.editor.openPublicPage")}
          </Button>

          <Button
            variant="outline"
            disabled={!canCopyShareLink}
            onClick={handleCopyShareLink}
          >
            {copiedShareLink ? <CheckIcon /> : <CopyIcon />}
            {copiedShareLink
              ? t("tools.roster.editor.shareLinkCopied")
              : t("tools.roster.editor.copyShareLink")}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{t("tools.roster.title")}</h2>

          <StudentPicker
            students={addableStudents}
            onStudentSelected={addStudent}
            className="w-[200px] md:w-[250px]"
          >
            <Button
              variant="outline"
              className="w-[200px] md:w-[250px] justify-between"
            >
              {t("tools.roster.editor.addStudent")}
              <ChevronsUpDownIcon />
            </Button>
          </StudentPicker>
        </div>

        {hiddenNotReleasedCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("tools.roster.editor.hiddenNotReleased", {
              count: hiddenNotReleasedCount,
            })}
          </p>
        )}

        {filteredRosterItems.length === 0 ? (
          <MessageBox>{t("tools.roster.editor.emptyState")}</MessageBox>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t("tools.roster.editor.reorderHint")}
            </p>

            <RosterItemsGrid
              items={rosterItems}
              gameServer={gameServer}
              updateRosterItem={updateRosterItem}
              onRemove={removeStudent}
              onReorder={reorderRosterItems}
              isReleasedOnServer={isReleasedOnServer}
            />
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent z-50 p-4 pt-8 flex justify-center">
        <Button onClick={handleWantsToUpdate} disabled={isSaving}>
          <SaveIcon />
          {isSaving ? t("common.saving") : t("common.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
