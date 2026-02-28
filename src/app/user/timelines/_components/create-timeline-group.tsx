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
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";

export function CreateTimelineGroup() {
  const t = useTranslations();
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

      toast.success(t("tools.myTimelines.createGroup.toasts.success"));
      router.push(`/user/timelines/${newGroup}`);
    } catch (err) {
      console.error("Failed to create timeline group", err);
      toast.error(t("tools.myTimelines.createGroup.toasts.fail"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">{t("tools.myTimelines.createGroup.title")}</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t("common.name")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Timeline Group"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">
          {t("common.description")}
          <small className="text-muted-foreground text-xs">
            {t("common.supportsMarkdown")}
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
        <Label>{t("common.visibility")}</Label>

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

      {visibility === "public" && (
        <div className="flex gap-2 items-center">
          <Label className="shrink-0">{t("common.showCreator")}</Label>

          <Select
            value={showCreator ? "yes" : "no"}
            onValueChange={(val) => setShowCreator(val === "yes")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">{t("common.no")}</SelectItem>
              <SelectItem value="yes">{t("common.yes")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Button onClick={handleCreate} disabled={name.length === 0}>
          {t("tools.myTimelines.createGroup.submit")}
        </Button>
      </div>
    </div>
  );
}
