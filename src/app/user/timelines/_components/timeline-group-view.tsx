"use client";

import {
  type TimelineDocWithId,
  TimelineGroupItemsContainer,
} from "@/app/user/timelines/_components/timeline-group-items-container";
import { MarkdownTips } from "@/components/common/markdown-tips";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Textarea } from "@/components/ui/textarea";
import { useQueryWithStatus } from "@/lib/convex";
import { useMutation } from "convex/react";
import { SaveIcon, ShareIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

export type TimelineGroupViewProps = {
  groupId: Id<"timelineGroup">;
};

export function TimelineGroupView({ groupId }: TimelineGroupViewProps) {
  const query = useQueryWithStatus(api.timelineGroup.getOwnById, {
    id: groupId,
  });

  const allTimelinesQuery = useQueryWithStatus(api.timeline.getOwn);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [showCreator, setShowCreator] = useState(false);

  const [items, setItems] = useState<TimelineDocWithId[]>([]);

  const [popoverOpen, setPopoverOpen] = useState(false);

  const updateMutation = useMutation(api.timelineGroup.update);

  useEffect(() => {
    if (query.status !== "success" || !query.data) {
      return;
    }

    setItems(query.data.timelines.map((t) => ({ ...t, id: t._id })));

    setName(query.data.name);
    setDescription(query.data.description || "");
    setVisibility(query.data.visibility);
    setShowCreator(query.data.showCreator ?? false);
  }, [groupId, query.status]);

  function onWantsToAdd(item: Doc<"timeline">) {
    if (items.find((i) => i._id === item._id)) {
      return;
    }

    setItems((current) => [...current, { ...item, id: item._id }]);
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
      });

      toast.success("Timeline group updated");
    } catch (err) {
      console.error("Failed to update timeline group", err);
      toast.error("Failed to update timeline group");
    }
  }

  async function copyLink() {
    const url = new URL(`/timelines/g/${groupId}`, window.location.origin);

    await navigator.clipboard.writeText(url.toString());

    toast.success("Link copied to clipboard.");
  }

  if (query.status === "pending") {
    return <MessageBox>Loading...</MessageBox>;
  }

  if (query.status === "error" || !query.data) {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load timeline group.
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Edit Timeline Group</h2>

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

        <Separator />

        <div className="flex gap-2 items-center">
          <Label>Add Timeline</Label>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">Select Timeline to Add</Button>
            </PopoverTrigger>

            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Type to search..." className="h-9" />

                <CommandList>
                  <CommandEmpty>No timelines found.</CommandEmpty>

                  <CommandGroup>
                    {(allTimelinesQuery.data ?? []).map((timeline) => (
                      <CommandItem
                        key={timeline._id}
                        value={
                          timeline.name ?? `Untitled Timeline ${timeline._id}`
                        }
                        onSelect={() => {
                          onWantsToAdd(timeline);
                          setPopoverOpen(false);
                        }}
                      >
                        {timeline.name ?? `Untitled Timeline ${timeline._id}`}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Separator />

      {items.length === 0 && (
        <MessageBox>This group does not have any timelines yet.</MessageBox>
      )}

      <TimelineGroupItemsContainer
        items={items}
        setItems={setItems}
        onWantsToRemove={onWantsToRemove}
      />

      <div className="flex items-center justify-center gap-4">
        {visibility === "public" && (
          <Button variant="outline" onClick={copyLink}>
            <ShareIcon />
            Share Timeline Group
          </Button>
        )}

        <Button onClick={saveChanges}>
          <SaveIcon />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
