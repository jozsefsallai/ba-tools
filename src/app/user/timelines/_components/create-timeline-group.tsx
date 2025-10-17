"use client";

import { MarkdownTips } from "@/components/common/markdown-tips";
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
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";

export function CreateTimelineGroup() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [showCreator, setShowCreator] = useState(false);

  const router = useRouter();

  const createMutation = useMutation(api.timelineGroup.create);

  async function handleCreate() {
    try {
      const newGroup = await createMutation({
        name,
        description: description.length > 0 ? description : undefined,
        visibility,
        showCreator: visibility === "public" ? showCreator : false,
      });

      toast.success("Timeline group created");
      router.push(`/user/timelines/${newGroup}`);
    } catch (err) {
      console.error("Failed to create timeline group", err);
      toast.error("Failed to create timeline group");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Create Timeline Group</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Timeline Group"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">
          Description
          <small className="text-muted-foreground text-xs">
            (supports Markdown)
          </small>
        </Label>

        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A description of this timeline group (optional)"
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

      {visibility === "public" && (
        <div className="flex gap-2 items-center">
          <Label className="shrink-0">Show Creator</Label>

          <Select
            value={showCreator ? "yes" : "no"}
            onValueChange={(val) => setShowCreator(val === "yes")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Button onClick={handleCreate} disabled={name.length === 0}>
          Create Timeline Group
        </Button>
      </div>
    </div>
  );
}
