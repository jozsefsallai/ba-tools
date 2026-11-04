"use client";

import { useMutation } from "convex/react";
import { PlusIcon, SaveIcon, ShareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddTimelinesDialog } from "@/app/[locale]/user/timelines/_components/add-timelines-dialog";
import {
  type TimelineDocWithId,
  TimelineGroupItemsContainer,
} from "@/app/[locale]/user/timelines/_components/timeline-group-items-container";
import { MarkdownTips } from "@/components/common/markdown-tips";
import { MessageBox } from "@/components/common/message-box";
import { RaidDetailsForm } from "@/components/raid/raid-details-form";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { getInitialAutoName, useAutoName } from "@/hooks/use-auto-name";
import { useQueryWithStatus } from "@/lib/convex";
import {
  inferGroupRaid,
  type RaidInfo,
  resolveGroupRaid,
} from "@/lib/raid-info";
import type { RoadmapRaidItem } from "@/lib/roadmap/types";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

export type TimelineGroupViewProps = {
  groupId: Id<"timelineGroup">;
  roadmapRaids: RoadmapRaidItem[];
};

export function TimelineGroupView({
  groupId,
  roadmapRaids,
}: TimelineGroupViewProps) {
  const t = useTranslations();
  const query = useQueryWithStatus(api.timelineGroup.getOwnById, {
    id: groupId,
  });

  const allTimelinesQuery = useQueryWithStatus(api.timeline.getOwn, {});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [showCreator, setShowCreator] = useState(false);

  const [items, setItems] = useState<TimelineDocWithId[]>([]);

  const [raid, setRaid] = useState<RaidInfo | undefined>(undefined);
  const [autoName, setAutoName] = useState(false);

  const inferredRaid = useMemo(
    () => inferGroupRaid(items.map((item) => item.raid)),
    [
      items,
    ],
  );
  const resolvedRaid = useMemo(
    () => resolveGroupRaid(raid, inferredRaid),
    [
      raid,
      inferredRaid,
    ],
  );

  const { onNameChange, seedAutoName } = useAutoName({
    raid: resolvedRaid,
    autoName,
    setName,
    setAutoName,
  });

  const updateMutation = useMutation(api.timelineGroup.update);

  useEffect(() => {
    if (query.status !== "success" || !query.data) {
      return;
    }

    setItems(
      query.data.timelines.map((t) => ({
        ...t,
        id: t._id,
      })),
    );

    seedAutoName(resolveGroupRaid(query.data.raid, query.data.inferredRaid));
    setRaid(query.data.raid);
    setAutoName(getInitialAutoName(query.data.name, query.data.autoName));
    setName(query.data.name);
    setDescription(query.data.description || "");
    setVisibility(query.data.visibility);
    setShowCreator(query.data.showCreator ?? false);
  }, [
    groupId,
    query.status,
  ]);

  function onWantsToAdd(added: Doc<"timeline">[]) {
    setItems((current) => {
      const existing = new Set(current.map((item) => item._id));

      return [
        ...current,
        ...added
          .filter((item) => !existing.has(item._id))
          .map((item) => ({
            ...item,
            id: item._id,
          })),
      ];
    });
  }

  function onWantsToRemove(item: TimelineDocWithId) {
    setItems((current) => current.filter((i) => i._id !== item._id));
  }

  async function saveChanges() {
    try {
      await updateMutation({
        id: groupId,
        name,
        description: description.length > 0 ? description : undefined,
        visibility,
        showCreator: visibility === "public" ? showCreator : false,
        timelines: items.map((i) => i._id),
        raid: raid ?? null,
        autoName: autoName && name.length > 0,
      });

      toast.success(t("tools.myTimelines.editGroup.toasts.success"));
    } catch (err) {
      console.error("Failed to update timeline group", err);
      toast.error(t("tools.myTimelines.editGroup.toasts.fail"));
    }
  }

  async function copyLink() {
    const url = new URL(`/timelines/g/${groupId}`, window.location.origin);

    await navigator.clipboard.writeText(url.toString());

    toast.success(t("tools.myTimelines.editGroup.toasts.linkCopied"));
  }

  if (query.status === "pending") {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (query.status === "error" || !query.data) {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("tools.timelineGroupView.failedToLoad")}
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">
            {t("tools.myTimelines.editGroup.title")}
          </h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{t("common.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
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

          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2 items-center">
              <Label className="shrink-0">{t("common.visibility")}</Label>

              <Select
                value={visibility}
                onValueChange={(val) =>
                  setVisibility(val as "public" | "private")
                }
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">
              {t("tools.raidDetails.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("tools.raidDetails.autoDescription")}
            </p>
          </div>

          <RaidDetailsForm
            scope="group"
            value={raid}
            onChange={setRaid}
            inferred={inferredRaid}
            roadmapRaids={roadmapRaids}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">
            {t("tools.myTimelines.editGroup.timelinesCount", {
              count: items.length,
            })}
          </h2>

          <AddTimelinesDialog
            timelines={allTimelinesQuery.data ?? []}
            existingIds={items.map((item) => item._id)}
            groupRaid={resolvedRaid}
            onAdd={onWantsToAdd}
          >
            <Button variant="outline">
              <PlusIcon />
              {t("tools.myTimelines.editGroup.addTimelines")}
            </Button>
          </AddTimelinesDialog>
        </div>

        {items.length === 0 && (
          <MessageBox>
            {t("tools.myTimelines.editGroup.noTimelinesInGroup")}
          </MessageBox>
        )}

        <TimelineGroupItemsContainer
          items={items}
          setItems={setItems}
          onWantsToRemove={onWantsToRemove}
        />
      </section>

      <div className="flex items-center justify-center gap-4 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-4 max-md:border-t max-md:bg-background/95 max-md:p-3 max-md:backdrop-blur">
        {visibility === "public" && (
          <Button variant="outline" onClick={copyLink}>
            <ShareIcon />
            {t("tools.myTimelines.editGroup.shareGroup")}
          </Button>
        )}

        <Button onClick={saveChanges}>
          <SaveIcon />
          {t("common.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
