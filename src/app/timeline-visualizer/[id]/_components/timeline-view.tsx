"use client";

import {
  type TimelineItem,
  TimelinePreview,
} from "@/app/timeline-visualizer/_components/timeline-preview";
import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import type { Student } from "@prisma/client";
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

export type TimelineViewProps = {
  id: string;
  allStudents: Student[];
};

export function TimelineView({ id, allStudents }: TimelineViewProps) {
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
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-bold">
            {query.data.name ?? "Untitled Timeline"}
          </h1>
        </div>
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
            Download Image
          </Button>
        </div>
      </div>
    </div>
  );
}
