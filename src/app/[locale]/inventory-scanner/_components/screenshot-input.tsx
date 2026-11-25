"use client";

import {
  FilmIcon,
  ImagePlusIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  isVideoFile,
  type Upload,
} from "@/app/[locale]/inventory-scanner/_lib/entries";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INPUT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export function ScreenshotInput({
  uploads,
  onAdd,
  onView,
  onRemove,
  onClear,
}: {
  uploads: Upload[];
  onAdd: (files: File[]) => void;
  onView: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const t = useTranslations();

  const input = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);

  function add(files: Iterable<File> | null | undefined) {
    const images = [
      ...(files ?? []),
    ].filter((file) => INPUT_TYPES.includes(file.type) || isVideoFile(file));

    if (images.length > 0) {
      onAdd(images);
    }
  }

  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    add(event.clipboardData?.files);
  });

  useEffect(() => {
    const listener = (event: ClipboardEvent) => onPaste(event);
    document.addEventListener("paste", listener);
    return () => document.removeEventListener("paste", listener);
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <input
        ref={input}
        type="file"
        multiple
        accept={INPUT_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          add(event.target.files);
          event.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
        className={cn(
          "hover:bg-accent/50 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center",
          uploads.length > 0 ? "py-5" : "min-h-64 flex-1 py-8",
          dragging && "border-primary bg-accent",
        )}
      >
        <ImagePlusIcon className="text-muted-foreground size-7" />

        <span className="font-medium">
          {t("tools.inventoryScanner.input.add")}
        </span>

        <span className="text-muted-foreground text-sm">
          {t("tools.inventoryScanner.input.private")}
        </span>
      </button>

      {uploads.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="grid max-h-80 grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5 overflow-y-auto">
            {uploads.map((upload, index) => {
              const busy =
                upload.kind === "video"
                  ? upload.status === "reading"
                  : upload.status === "queued";

              const problem =
                upload.kind === "video"
                  ? upload.status === "unsupported"
                    ? "tools.inventoryScanner.warnings.video.unsupported"
                    : upload.status === "failed"
                      ? "tools.inventoryScanner.warnings.video.failed"
                      : null
                  : upload.status === "failed"
                    ? "tools.inventoryScanner.input.failed"
                    : upload.status === "done" && !upload.result?.screenshot
                      ? "tools.inventoryScanner.input.noGrid"
                      : null;

              const name =
                upload.kind === "video" ? upload.file.name : upload.name;

              return (
                <li
                  key={upload.id}
                  className={cn(
                    "relative overflow-hidden rounded-md border",
                    problem && "border-destructive",
                  )}
                  title={problem ? t(problem) : name}
                >
                  <button
                    type="button"
                    onClick={() => onView(upload.id)}
                    aria-label={t("tools.inventoryScanner.viewer.open", {
                      name,
                    })}
                    className="focus-visible:ring-ring block w-full cursor-zoom-in focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                  >
                    {upload.kind === "video" ? (
                      <video
                        src={upload.url}
                        muted
                        playsInline
                        preload="metadata"
                        className={cn(
                          "aspect-video w-full bg-black object-cover",
                          (problem || busy) && "opacity-40",
                        )}
                      />
                    ) : (
                      <img
                        src={upload.url}
                        alt=""
                        className={cn(
                          "aspect-video w-full object-cover",
                          (problem || busy) && "opacity-40",
                        )}
                      />
                    )}
                  </button>

                  <span
                    aria-hidden
                    className="bg-background/85 pointer-events-none absolute bottom-0.5 left-0.5 flex items-center gap-1 rounded px-1 text-xs leading-4 font-medium tabular-nums"
                  >
                    {upload.kind === "video" && (
                      <FilmIcon
                        className="size-3"
                        aria-label={t("tools.inventoryScanner.input.video")}
                      />
                    )}
                    {index + 1}
                  </span>

                  {busy &&
                    (upload.kind === "video" ? (
                      <span className="pointer-events-none absolute inset-0 m-auto flex items-center justify-center text-sm font-semibold tabular-nums">
                        {t("tools.inventoryScanner.input.videoProgress", {
                          percent: Math.floor(upload.progress * 100),
                        })}
                      </span>
                    ) : (
                      <LoaderCircleIcon className="pointer-events-none absolute inset-0 m-auto size-5 animate-spin" />
                    ))}

                  {problem && (
                    <TriangleAlertIcon className="text-destructive pointer-events-none absolute inset-0 m-auto size-5" />
                  )}

                  <button
                    type="button"
                    onClick={() => onRemove(upload.id)}
                    aria-label={t("tools.inventoryScanner.input.remove")}
                    className="bg-background/80 hover:bg-background absolute top-0.5 right-0.5 cursor-pointer rounded p-0.5"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground self-start"
            onClick={onClear}
          >
            {t("tools.inventoryScanner.input.clear")}
          </Button>
        </div>
      )}
    </div>
  );
}
