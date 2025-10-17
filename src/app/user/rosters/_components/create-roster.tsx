"use client";

import { MarkdownTips } from "@/components/common/markdown-tips";
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
import { Textarea } from "@/components/ui/textarea";
import { useStudents } from "@/hooks/use-students";
import { GAME_SERVER_NAMES, GAME_SERVERS, type GameServer } from "@/lib/types";
import type { Student } from "@prisma/client";
import { useMutation } from "convex/react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";

export function CreateRoster() {
  const { students } = useStudents();

  const [name, setName] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [accountLevel, setAccountLevel] = useState<number>(1);
  const [studentRep, setStudentRep] = useState<Student | null>(null);
  const [gameServer, setGameServer] = useState<GameServer>("JP");
  const [friendCode, setFriendCode] = useState("");

  const router = useRouter();

  const createMutation = useMutation(api.roster.create);

  async function handleCreate() {
    try {
      const id = await createMutation({
        name: name.length > 0 ? name : undefined,
        introduction: introduction.length > 0 ? introduction : undefined,
        visibility,
        accountLevel,
        studentRepId: studentRep ? studentRep.id : undefined,
        gameServer,
        friendCode,
      });

      toast.success("Roster created successfully!");
      router.push(`/user/rosters/${id}`);
    } catch (err) {
      console.error("Failed to create roster", err);
      toast.error("Failed to create roster.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Create Roster</h2>

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
            students={students}
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

      <div>
        <Button onClick={handleCreate} disabled={name.length === 0}>
          Create Roster
        </Button>
      </div>
    </div>
  );
}
