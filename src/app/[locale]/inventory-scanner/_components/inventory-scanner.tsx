"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { CheckList } from "@/app/[locale]/inventory-scanner/_components/check-list";
import { ExportBar } from "@/app/[locale]/inventory-scanner/_components/export-bar";
import {
  InventorySection,
  itemName,
  missingText,
} from "@/app/[locale]/inventory-scanner/_components/inventory-section";
import { ScreenshotInput } from "@/app/[locale]/inventory-scanner/_components/screenshot-input";
import {
  ScreenshotViewer,
  type ViewedScreenshot,
} from "@/app/[locale]/inventory-scanner/_components/screenshot-viewer";
import {
  ScanInstructions,
  StartGuide,
} from "@/app/[locale]/inventory-scanner/_components/start-guide";
import {
  buildEntries,
  type Edits,
  formatVideoTime,
  type InventoryEntry,
  isVideoFile,
  type ScreenshotState,
  type Upload,
  type VideoState,
} from "@/app/[locale]/inventory-scanner/_lib/entries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ItemIconCatalog } from "@/lib/inventory-scan/catalog-format";
import { InventoryScanClient } from "@/lib/inventory-scan/client";
import { type MissingSpot, mergeScreenshots } from "@/lib/inventory-scan/merge";
import { SCAN_GROUPS, type ScopedItem } from "@/lib/inventory-scan/scope";
import {
  readVideoFrames,
  UnsupportedVideoError,
} from "@/lib/inventory-scan/video";

const MAX_UPLOADS = 100;

// How long scanned frames of a video wait to be shown together, in ms
const FRAME_BATCH_DELAY = 1000;

// Names to list before shortening to a number
const MAX_LISTED_UNKNOWN = 12;

/** Groups items by the place in the screenshots they would be in. */
function missingSpots(entries: InventoryEntry[]) {
  const spots = new Map<
    string,
    {
      spot: MissingSpot;
      entries: InventoryEntry[];
    }
  >();

  for (const entry of entries) {
    const spot = entry.missing ?? {
      previous: null,
      next: null,
    };

    const key = `${spot.previous}:${spot.next}`;
    const existing = spots.get(key);

    if (existing) {
      existing.entries.push(entry);
    } else {
      spots.set(key, {
        spot,
        entries: [
          entry,
        ],
      });
    }
  }

  return [
    ...spots.values(),
  ];
}

export function InventoryScanner({ items }: { items: ScopedItem[] }) {
  const t = useTranslations();
  const missingT = useTranslations("tools.inventoryScanner.missing");

  const locale = useLocale();

  const [screenshots, setScreenshots] = useState<ScreenshotState[]>([]);
  const [videos, setVideos] = useState<VideoState[]>([]);
  const [catalog, setCatalog] = useState<ItemIconCatalog | null>(null);
  const [edits, setEdits] = useState<Edits>({});
  const [viewed, setViewed] = useState<ViewedScreenshot | null>(null);
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set());

  const client = useRef<InventoryScanClient | null>(null);
  const urls = useRef(new Set<string>());
  const readers = useRef(new Map<string, AbortController>());
  const nextOrder = useRef(0);

  useEffect(() => {
    const ownedUrls = urls.current;

    const ownedReaders = readers.current;

    return () => {
      for (const reader of ownedReaders.values()) {
        reader.abort();
      }

      client.current?.dispose();
      client.current = null;

      for (const url of ownedUrls) {
        URL.revokeObjectURL(url);
      }

      ownedUrls.clear();
    };
  }, []);

  function update(id: string, changes: Partial<ScreenshotState>) {
    setScreenshots((current) =>
      current.map((screenshot) =>
        screenshot.id === id
          ? {
              ...screenshot,
              ...changes,
            }
          : screenshot,
      ),
    );
  }

  function updateVideo(id: string, changes: Partial<VideoState>) {
    setVideos((current) =>
      current.map((video) =>
        video.id === id
          ? {
              ...video,
              ...changes,
            }
          : video,
      ),
    );
  }

  // Frames are added in batches: rendering the page after each one slows the
  // video down, which then skips frames
  const queuedFrames = useRef<ScreenshotState[]>([]);
  const frameFlush = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flushFrames() {
    if (frameFlush.current) {
      clearTimeout(frameFlush.current);
      frameFlush.current = null;
    }

    const frames = queuedFrames.current;
    queuedFrames.current = [];

    if (frames.length > 0) {
      setScreenshots((current) => [
        ...current,
        ...frames,
      ]);
    }
  }

  function queueFrame(frame: ScreenshotState) {
    queuedFrames.current.push(frame);
    frameFlush.current ??= setTimeout(flushFrames, FRAME_BATCH_DELAY);
  }

  async function readVideo({ id, file, order }: VideoState) {
    client.current ??= new InventoryScanClient();
    const scanner = client.current;
    const reader = new AbortController();
    readers.current.set(id, reader);

    try {
      setCatalog(await scanner.load());

      await readVideoFrames(file, {
        signal: reader.signal,
        onProgress: (progress) =>
          updateVideo(id, {
            progress,
          }),
        onFrame: async (frame, time) => {
          const result = await scanner.scan(frame, {
            keepImage: true,
          });

          if (!result.screenshot || !result.image || reader.signal.aborted) {
            return;
          }

          const url = URL.createObjectURL(result.image);
          urls.current.add(url);

          queueFrame({
            id: uuid(),
            file: result.image as Blob,
            name: t("tools.inventoryScanner.label.frameName", {
              name: file.name,
              time: formatVideoTime(time),
            }),
            url,
            status: "done",
            result,
            order,
            video: {
              upload: id,
              time,
            },
          });
        },
      });

      flushFrames();
      updateVideo(id, {
        status: "done",
        progress: 1,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error(error);
      updateVideo(id, {
        status:
          error instanceof UnsupportedVideoError ? "unsupported" : "failed",
      });
    } finally {
      readers.current.delete(id);
    }
  }

  async function scan({ id, file }: ScreenshotState) {
    client.current ??= new InventoryScanClient();

    try {
      setCatalog(await client.current.load());

      update(id, {
        status: "done",
        result: await client.current.scan(file),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error(error);
      update(id, {
        status: "failed",
      });
    }
  }

  function add(files: File[]) {
    const accepted = files.slice(0, MAX_UPLOADS - uploads.length);

    if (accepted.length < files.length) {
      toast.error(
        t("tools.inventoryScanner.input.tooMany", {
          max: MAX_UPLOADS,
        }),
      );
    }

    const added: ScreenshotState[] = [];
    const addedVideos: VideoState[] = [];

    for (const file of accepted) {
      const url = URL.createObjectURL(file);
      urls.current.add(url);

      const order = nextOrder.current++;

      if (isVideoFile(file)) {
        addedVideos.push({
          id: uuid(),
          file,
          url,
          order,
          status: "reading",
          progress: 0,
        });
      } else {
        added.push({
          id: uuid(),
          file,
          name: file.name,
          url,
          status: "queued",
          result: null,
          order,
        });
      }
    }

    setScreenshots((current) => [
      ...current,
      ...added,
    ]);

    setVideos((current) => [
      ...current,
      ...addedVideos,
    ]);

    for (const screenshot of added) {
      void scan(screenshot);
    }

    for (const video of addedVideos) {
      void readVideo(video);
    }
  }

  function release(removed: (ScreenshotState | VideoState)[]) {
    for (const { url } of removed) {
      URL.revokeObjectURL(url);
      urls.current.delete(url);
    }
  }

  /** Removes a screenshot, or a video with its frames. */
  function remove(id: string) {
    const isRemoved = (screenshot: ScreenshotState) =>
      screenshot.id === id || screenshot.video?.upload === id;

    readers.current.get(id)?.abort();

    queuedFrames.current = queuedFrames.current.filter(
      (frame) => frame.video?.upload !== id,
    );

    release([
      ...screenshots.filter(isRemoved),
      ...videos.filter((video) => video.id === id),
    ]);

    setScreenshots((current) =>
      current.filter((screenshot) => !isRemoved(screenshot)),
    );

    setVideos((current) => current.filter((video) => video.id !== id));
  }

  function clear() {
    for (const reader of readers.current.values()) {
      reader.abort();
    }

    queuedFrames.current = [];

    release([
      ...screenshots,
      ...videos,
    ]);

    setVideos([]);

    client.current?.dispose();
    client.current = null;

    setScreenshots([]);
    setEdits({});
    setConfirmed(new Set());
  }

  function edit(key: string, value: string) {
    setEdits((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function confirm({ key, count }: InventoryEntry) {
    edit(key, String(count));
    setConfirmed((current) => new Set(current).add(key));
  }

  const uploads = [
    ...screenshots
      .filter(({ video }) => !video)
      .map(
        (screenshot): Upload => ({
          kind: "screenshot",
          ...screenshot,
        }),
      ),
    ...videos.map(
      (video): Upload => ({
        kind: "video",
        ...video,
      }),
    ),
  ].sort((a, b) => a.order - b.order);

  const pending =
    screenshots.filter(({ status }) => status === "queued").length +
    videos.filter(({ status }) => status === "reading").length;
  const finished = pending === 0 && screenshots.length > 0;

  // Progress of all uploads, with videos counting by how far they've been read
  const progress = uploads.reduce(
    (total, upload) =>
      total +
      (upload.kind === "video"
        ? upload.status === "reading"
          ? upload.progress
          : 1
        : upload.status === "queued"
          ? 0
          : 1),
    0,
  );

  /** How a screenshot or frame is referred to, by the numbers of the uploads. */
  function label(index: number) {
    const screenshot = screenshots[index];

    if (!screenshot) {
      return "";
    }

    const upload = screenshot.video?.upload ?? screenshot.id;
    const number = uploads.findIndex(({ id }) => id === upload) + 1;

    return screenshot.video
      ? t("tools.inventoryScanner.label.frame", {
          number,
          time: formatVideoTime(screenshot.video.time),
        })
      : t("tools.inventoryScanner.label.screenshot", {
          number,
        });
  }

  const inventory = useMemo(
    () =>
      catalog && finished
        ? mergeScreenshots(
            screenshots.map(({ result }) => result?.screenshot ?? null),
            catalog,
          )
        : null,
    [
      catalog,
      finished,
      screenshots,
    ],
  );

  const entries = useMemo(
    () => buildEntries(items, inventory, edits),
    [
      items,
      inventory,
      edits,
    ],
  );

  // Items still being edited stay in the list until they're confirmed
  const toCheck = entries.filter(
    ({ scanned, key }) =>
      scanned && (scanned.uncertain || scanned.conflict) && !confirmed.has(key),
  );

  const unknown = entries.filter(
    ({ item, count, edited }) =>
      count === null && !edited && inventory?.parcelTypes.has(item.parcelType),
  );

  // Items were read, but none of them are ones the scanner keeps
  const nothingSupported =
    inventory !== null &&
    inventory.items.length > 0 &&
    entries.every(({ scanned }) => scanned === null);

  const failed = screenshots.filter(
    ({ status, result }) =>
      status === "failed" || (status === "done" && !result?.screenshot),
  ).length;

  const failedVideos = videos.flatMap((video) => {
    const problem: "unsupported" | "failed" | "noList" | null =
      video.status === "unsupported" || video.status === "failed"
        ? video.status
        : video.status === "done" &&
            !screenshots.some(({ video: frame }) => frame?.upload === video.id)
          ? "noList"
          : null;

    return problem
      ? [
          {
            video,
            problem,
          },
        ]
      : [];
  });

  function viewEntry({ scanned }: InventoryEntry) {
    if (scanned) {
      setViewed({
        id: screenshots[scanned.source.screenshot].id,
        rect: scanned.source.cell.rect,
      });
    }
  }

  function viewScreenshot(index: number | null) {
    const screenshot = index === null ? undefined : screenshots[index];

    if (screenshot) {
      setViewed({
        id: screenshot.id,
      });
    }
  }

  function viewUpload(id: string) {
    const screenshot = screenshots.find(
      (candidate) => candidate.id === id || candidate.video?.upload === id,
    );

    if (screenshot) {
      setViewed({
        id: screenshot.id,
      });
    }
  }

  const input = (
    <ScreenshotInput
      uploads={uploads}
      onAdd={add}
      onView={viewUpload}
      onRemove={remove}
      onClear={clear}
    />
  );

  if (uploads.length === 0) {
    return (
      <div className="grid gap-x-8 gap-y-8 lg:grid-cols-2">
        {input}
        <StartGuide items={items} />
      </div>
    );
  }

  return (
    <div className="grid items-start gap-x-8 gap-y-6 xl:grid-cols-[21rem_minmax(0,1fr)]">
      <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-4 xl:max-h-[calc(100svh-2rem)] xl:overflow-y-auto">
        {input}

        {pending > 0 && (
          <div className="flex flex-col gap-2">
            <Progress value={(progress / uploads.length) * 100} />
            <p className="text-muted-foreground text-sm tabular-nums">
              {t("tools.inventoryScanner.input.progress", {
                done: Math.floor(progress),
                total: uploads.length,
              })}
            </p>
          </div>
        )}

        <ExportBar entries={entries} />

        <details className="border-t pt-4">
          <summary className="cursor-pointer font-semibold">
            {t("tools.inventoryScanner.instructions.title")}
          </summary>

          <div className="pt-3">
            <ScanInstructions />
          </div>
        </details>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        {finished && failed > 0 && (
          <Alert variant="destructive">
            <TriangleAlertIcon />

            <AlertTitle>
              {t("tools.inventoryScanner.warnings.failed.title", {
                count: failed,
              })}
            </AlertTitle>

            <AlertDescription>
              {t("tools.inventoryScanner.warnings.failed.description")}
            </AlertDescription>
          </Alert>
        )}

        {failedVideos.length > 0 && (
          <Alert variant="destructive">
            <TriangleAlertIcon />

            <AlertTitle>
              {t("tools.inventoryScanner.warnings.video.title", {
                count: failedVideos.length,
              })}
            </AlertTitle>

            <AlertDescription>
              <ul className="flex flex-col gap-1">
                {failedVideos.map(({ video, problem }) => (
                  <li key={video.id}>
                    <span className="font-medium">{video.file.name}</span>
                    {": "}
                    {t(`tools.inventoryScanner.warnings.video.${problem}`)}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {nothingSupported && (
          <Alert>
            <TriangleAlertIcon />

            <AlertTitle>
              {t("tools.inventoryScanner.warnings.unsupported.title")}
            </AlertTitle>

            <AlertDescription>
              {t("tools.inventoryScanner.warnings.unsupported.description", {
                items: SCAN_GROUPS.map((group) =>
                  t(`tools.inventoryScanner.groups.${group}`),
                ).join(", "),
              })}
            </AlertDescription>
          </Alert>
        )}

        {inventory && !inventory.defaultOrder && (
          <Alert>
            <TriangleAlertIcon />

            <AlertTitle>
              {t("tools.inventoryScanner.warnings.order.title")}
            </AlertTitle>

            <AlertDescription>
              {t("tools.inventoryScanner.warnings.order.description")}
            </AlertDescription>
          </Alert>
        )}

        {inventory?.defaultOrder && !nothingSupported && unknown.length > 0 && (
          <Alert>
            <TriangleAlertIcon />

            <AlertTitle>
              {t("tools.inventoryScanner.warnings.unknown.title", {
                count: unknown.length,
              })}
            </AlertTitle>

            <AlertDescription>
              <p>{t("tools.inventoryScanner.warnings.unknown.description")}</p>

              <ul className="mt-1 flex w-full flex-col gap-2">
                {missingSpots(unknown).map(({ spot, entries: missed }) => (
                  <li
                    key={`${spot.previous}:${spot.next}`}
                    className="flex flex-col gap-1"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-foreground font-medium">
                        {missingText(missingT, spot, label)}
                      </span>

                      {spot.previous !== null && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => viewScreenshot(spot.previous)}
                        >
                          {t("tools.inventoryScanner.missing.show", {
                            name: label(spot.previous as number),
                          })}
                        </Button>
                      )}

                      {spot.next !== null && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => viewScreenshot(spot.next)}
                        >
                          {t("tools.inventoryScanner.missing.show", {
                            name: label(spot.next as number),
                          })}
                        </Button>
                      )}
                    </div>

                    <p>
                      {missed
                        .slice(0, MAX_LISTED_UNKNOWN)
                        .map((entry) => itemName(entry, locale))
                        .join(", ")}

                      {missed.length > MAX_LISTED_UNKNOWN &&
                        t("tools.inventoryScanner.missing.more", {
                          count: missed.length - MAX_LISTED_UNKNOWN,
                        })}
                    </p>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {inventory && toCheck.length > 0 && (
          <CheckList
            entries={toCheck}
            screenshots={screenshots}
            onChange={edit}
            onConfirm={confirm}
            onView={setViewed}
          />
        )}

        <div className="grid grid-cols-[repeat(auto-fill,17.25rem)] gap-x-6 gap-y-8">
          {SCAN_GROUPS.map((group) => {
            const members = entries.filter(({ item }) => item.group === group);

            return members.length > 0 ? (
              <InventorySection
                key={group}
                group={group}
                entries={members}
                onChange={edit}
                onView={viewEntry}
                label={label}
              />
            ) : null;
          })}
        </div>

        <p className="text-muted-foreground max-w-prose text-sm">
          {t("tools.inventoryScanner.review.legend")}
        </p>
      </div>

      <ScreenshotViewer
        screenshots={screenshots}
        viewed={viewed}
        onView={setViewed}
      />
    </div>
  );
}
