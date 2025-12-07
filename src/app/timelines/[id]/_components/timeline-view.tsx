"use client";

import {
  type TimelineItem,
  TimelinePreview,
} from "@/app/timeline-visualizer/_components/timeline-preview";
import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import type { Student } from "~prisma";
import { useMemo, useRef, useState } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import { v4 as uuid } from "uuid";
import html2canvas from "html2canvas-pro";
import { trimTransparentPixels } from "@/lib/canvas";
import { sleep } from "@/lib/sleep";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import slugify from "slugify";
import { CopyTextTimelineButton } from "@/app/timeline-visualizer/_components/copy-text-timeline-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DownloadIcon, PencilIcon } from "lucide-react";
import { MarkdownRenderer } from "@/components/common/markdown-renderer";
import Link from "next/link";
import { useStudents } from "@/hooks/use-students";

export type TimelineViewProps = {
  id: string;
};

export function TimelineView({ id }: TimelineViewProps) {
  const { students: allStudents } = useStudents();

  const containerRef = useRef<HTMLDivElement>(null);

  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [scale, setScale] = useState(1);

  const query = useQueryWithStatus(api.timeline.getById, {
    id: id as Id<"timeline">,
  });

  const items = useMemo<TimelineItem[]>(() => {
    if (!query.data) {
      return [];
    }

    const items: TimelineItem[] = [];

    for (const item of query.data.items) {
      if (item.type === "student") {
        const student = allStudents.find((s) => s.id === item.studentId);
        if (!student) {
          continue;
        }

        let target: Student | undefined = undefined;
        if (item.targetId) {
          target = allStudents.find((s) => s.id === item.targetId);
        }

        items.push({
          type: "student",
          id: uuid(),
          student,
          target,
          copy: item.copy,
          trigger: item.trigger,
          variantId: item.variantId,
          notes: item.notes,
        });
      } else {
        items.push({
          ...item,
          id: uuid(),
        });
      }
    }

    return items;
  }, [query.data]);

  async function getTimelineImage() {
    if (!containerRef.current || generationInProgress) {
      return;
    }

    setGenerationInProgress(true);

    await sleep(50);

    const canvas = await html2canvas(containerRef.current, {
      scale,
      backgroundColor: null,
    });

    const trimmedCanvas = trimTransparentPixels(canvas);

    const trimmedName = (query.data?.name ?? "").trim();
    const filename =
      trimmedName.length > 0
        ? slugify(trimmedName, {
            lower: true,
          })
        : "timeline";

    const src = trimmedCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = src;
    link.download = `${filename}.png`;
    link.click();

    setGenerationInProgress(false);
  }

  if (query.status === "pending") {
    return <MessageBox>Loading timeline...</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load timeline.
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 justify-between">
            <h1 className="text-3xl font-bold">
              {query.data.name ?? "Untitled Timeline"}
            </h1>

            {query.data.isOwn && (
              <Button variant="outline" asChild>
                <Link href={`/timeline-visualizer?id=${id}`}>
                  <PencilIcon /> Edit Timeline
                </Link>
              </Button>
            )}
          </div>

          {"user" in query.data && query.data.showCreator && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Created by</span>

              <Avatar className="size-6">
                <AvatarFallback>
                  {(query.data.user.name ?? query.data.user.username)[0]}
                </AvatarFallback>

                <AvatarImage src={query.data.user.avatar} />
              </Avatar>

              <span className="font-bold">
                {query.data.user.name ??
                  query.data.user.username ??
                  "Unknown User"}
              </span>
            </div>
          )}
        </div>

        {query.data.description && (
          <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:mt-4 max-w-none">
            <MarkdownRenderer>{query.data.description}</MarkdownRenderer>
          </div>
        )}
      </div>

      <TimelinePreview
        containerRef={containerRef}
        items={items}
        itemSpacing={query.data.itemSpacing}
        verticalSeparatorSize={query.data.verticalSeparatorSize}
        horizontalSeparatorSize={query.data.horizontalSeparatorSize}
        busy={generationInProgress}
      />

      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <Label>Scale</Label>

          <Select
            value={scale.toString()}
            onValueChange={(val) => setScale(Number.parseInt(val, 10))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="3">3x</SelectItem>
              <SelectItem value="4">4x</SelectItem>
              <SelectItem value="5">5x</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4 items-center justify-center">
          <CopyTextTimelineButton items={items} />

          <Button
            onClick={getTimelineImage}
            disabled={items.length === 0 || generationInProgress}
          >
            <DownloadIcon />
            Download Image
          </Button>
        </div>
      </div>
    </div>
  );
}
