"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  MemorialLobbyInteraction,
  MemorialLobbyRenderer,
  ResolvedMemorialLobby,
  TouchMode,
} from "@/lib/memorial-lobby/renderer";
import { cn } from "@/lib/utils";
import {
  CameraIcon,
  CheckIcon,
  LoaderCircleIcon,
  MaximizeIcon,
  // MessageCircleIcon,
  MinimizeIcon,
  PlayIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Status = "idle" | "loading" | "ready" | "error";

const SHOW_DEBUG_TOOLS = process.env.NODE_ENV !== "production";

const SCREENSHOT_KEY = "s";
const OVERLAY_BUTTON_CLASS = "bg-background/80 rounded-full backdrop-blur";

export const ZONE_LEGEND = [
  { label: "Headpat", color: "#ff0080" },
  { label: "Cheek", color: "#ff9900" },
  { label: "Hand", color: "#00d0ff" },
];

type MemorialLobbyViewerProps = {
  lobbies: ResolvedMemorialLobby[];
  posterUrl: string;
  autoPlay?: boolean;
  compact?: boolean;
  showZones?: boolean;
};

export function MemorialLobbyViewer({
  lobbies,
  posterUrl,
  autoPlay = false,
  compact = false,
  showZones: showZonesProp,
}: MemorialLobbyViewerProps) {
  const t = useTranslations();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MemorialLobbyRenderer | null>(null);
  const touchModeRef = useRef<TouchMode | null>(null);

  const [status, setStatus] = useState<Status>(autoPlay ? "loading" : "idle");
  const [lobbyIndex, setLobbyIndex] = useState(0);
  const [interactions, setInteractions] = useState<MemorialLobbyInteraction[]>(
    [],
  );
  const [localShowZones, setShowZones] = useState(false);
  const showZones = showZonesProp ?? localShowZones;
  const [cursor, setCursor] = useState<"default" | "grab" | "grabbing">(
    "default",
  );

  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const scrollBeforeFullscreenRef = useRef<number | null>(null);

  const lobby = lobbies[lobbyIndex] ?? lobbies[0];

  useEffect(() => {
    setCanFullscreen(document.fullscreenEnabled);

    function handleFullscreenChange() {
      const fullscreen =
        !!containerRef.current &&
        document.fullscreenElement === containerRef.current;

      setIsFullscreen(fullscreen);

      const scrollY = scrollBeforeFullscreenRef.current;
      if (!fullscreen && scrollY !== null) {
        scrollBeforeFullscreenRef.current = null;

        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: "instant" });
        });
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    let cancelled = false;
    let renderer: MemorialLobbyRenderer | null = null;

    setStatus("loading");
    setInteractions([]);

    (async () => {
      try {
        const { MemorialLobbyRenderer } = await import(
          "@/lib/memorial-lobby/renderer"
        );

        if (cancelled) {
          return;
        }

        renderer = new MemorialLobbyRenderer(
          canvas,
          container.clientWidth,
          container.clientHeight,
        );
        rendererRef.current = renderer;

        await renderer.load(lobby);

        if (cancelled) {
          return;
        }

        setInteractions(renderer.interactions);
        setStatus("ready");
      } catch (err) {
        console.error("Failed to load memorial lobby", err);

        if (!cancelled) {
          setStatus("error");
        }
      }
    })();

    const observer = new ResizeObserver(() => {
      renderer?.resize(container.clientWidth, container.clientHeight);
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
      renderer?.destroy();
      if (rendererRef.current === renderer) {
        rendererRef.current = null;
      }
    };
  }, [status === "idle", lobby]);

  useEffect(() => {
    if (status === "ready") {
      rendererRef.current?.setShowZones(showZones);
    }
  }, [showZones, status]);

  // Screenshot key is used while interacting with the student in the memorial
  // lobby because you can't click the screenshot button.
  const copyScreenshotRef = useRef(copyScreenshot);
  copyScreenshotRef.current = copyScreenshot;

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        !touchModeRef.current ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.toLowerCase() !== SCREENSHOT_KEY
      ) {
        return;
      }

      event.preventDefault();
      copyScreenshotRef.current();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [status]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      scrollBeforeFullscreenRef.current = window.scrollY;
      containerRef.current?.requestFullscreen().catch((err) => {
        scrollBeforeFullscreenRef.current = null;
        console.error("Failed to enter fullscreen", err);
      });
    }
  }

  async function copyScreenshot() {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": renderer.screenshot({ native: !isFullscreen }),
        }),
      ]);
    } catch (err) {
      console.error("Failed to copy lobby screenshot", err);
      toast.error(t("tools.students.detail.memorialLobby.screenshotFailed"));
      return;
    }

    toast.success(t("tools.students.detail.memorialLobby.screenshotCopied"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function pointerPosition(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const renderer = rendererRef.current;
    if (status !== "ready" || !renderer?.canTouch || event.button !== 0) {
      return;
    }

    const { x, y } = pointerPosition(event);

    const mode = renderer.startTouch(x, y);
    if (!mode) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    touchModeRef.current = mode;
    setCursor(mode === "look" ? "default" : "grabbing");
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const renderer = rendererRef.current;
    if (status !== "ready" || !renderer) {
      return;
    }

    const { x, y } = pointerPosition(event);

    if (touchModeRef.current) {
      renderer.moveTouch(x, y);
    } else if (event.pointerType === "mouse") {
      setCursor(
        renderer.canTouch && renderer.isOverSpot(x, y) ? "grab" : "default",
      );
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!touchModeRef.current) {
      return;
    }

    touchModeRef.current = null;
    rendererRef.current?.endTouch();

    const renderer = rendererRef.current;

    const { x, y } = pointerPosition(event);

    setCursor(
      event.pointerType === "mouse" && renderer?.isOverSpot(x, y)
        ? "grab"
        : "default",
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        style={{ cursor: cursor === "default" ? undefined : cursor }}
        className={cn(
          "bg-muted group relative aspect-[4/3] w-full overflow-hidden rounded-lg border",
          "[&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:bg-black",
          // Pressing and dragging steers the student's gaze, so it shouldn't
          // scroll the page on touch screens.
          status === "ready" && "touch-none select-none",
        )}
      >
        {status === "idle" ? (
          <button
            type="button"
            onClick={() => setStatus("loading")}
            className="group absolute inset-0 flex items-center justify-center"
          >
            <img
              src={posterUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-md"
            />

            <span className="bg-background/90 relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-md transition group-hover:scale-105">
              <PlayIcon className="size-4" />
              {t("tools.students.detail.memorialLobby.load")}
            </span>
          </button>
        ) : (
          <canvas
            // A destroyed WebGL context can't be reused, so each lobby gets a
            // fresh canvas.
            key={lobby.id}
            ref={canvasRef}
            className={cn(
              "absolute inset-0 h-full w-full transition-opacity",
              status === "ready" ? "opacity-100" : "opacity-0",
            )}
          />
        )}

        {status === "loading" && (
          <div className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-2 text-sm">
            <LoaderCircleIcon className="size-4 animate-spin" />
            {t("tools.students.detail.memorialLobby.loading")}
          </div>
        )}

        {status === "error" && (
          <div className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-2 text-sm">
            <TriangleAlertIcon className="size-4" />
            {t("tools.students.detail.memorialLobby.error")}
          </div>
        )}

        {status === "ready" && (
          <div
            // Presses on the controls shouldn't touch the student.
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <Button
              variant="outline"
              size="icon-sm"
              className={OVERLAY_BUTTON_CLASS}
              onClick={copyScreenshot}
              disabled={copied}
              title={t("tools.students.detail.memorialLobby.screenshot")}
            >
              {copied ? <CheckIcon /> : <CameraIcon />}
              <span className="sr-only">
                {t("tools.students.detail.memorialLobby.screenshot")}
              </span>
            </Button>

            {canFullscreen && (
              <Button
                variant="outline"
                size="icon-sm"
                className={OVERLAY_BUTTON_CLASS}
                onClick={toggleFullscreen}
                title={
                  isFullscreen
                    ? t("tools.students.detail.memorialLobby.exitFullscreen")
                    : t("tools.students.detail.memorialLobby.fullscreen")
                }
              >
                {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
                <span className="sr-only">
                  {isFullscreen
                    ? t("tools.students.detail.memorialLobby.exitFullscreen")
                    : t("tools.students.detail.memorialLobby.fullscreen")}
                </span>
              </Button>
            )}
          </div>
        )}
      </div>

      {status === "ready" && !compact && (
        <p className="text-muted-foreground text-xs">
          {t("tools.students.detail.memorialLobby.hint")}
        </p>
      )}

      {SHOW_DEBUG_TOOLS &&
        showZonesProp === undefined &&
        status === "ready" && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed px-3 py-2 text-xs">
            <span className="text-muted-foreground font-semibold uppercase">
              Debug
            </span>

            <Button
              variant={showZones ? "default" : "outline"}
              size="xs"
              aria-pressed={showZones}
              onClick={() => setShowZones((show) => !show)}
            >
              Show touch areas
            </Button>

            {showZones &&
              ZONE_LEGEND.map(({ label, color }) => (
                <span key={label} className="inline-flex items-center gap-1">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
          </div>
        )}

      {(lobbies.length > 1 || interactions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {lobbies.length > 1 && (
            <Select
              value={String(lobbyIndex)}
              onValueChange={(value) => setLobbyIndex(Number(value))}
            >
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {lobbies.map((l, idx) => (
                  <SelectItem key={l.id} value={String(idx)}>
                    {t("tools.students.detail.memorialLobby.lobby", {
                      index: idx + 1,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* {interactions.map((interaction) => (
            <Button
              key={interaction.id}
              variant="outline"
              size="sm"
              onClick={() =>
                rendererRef.current?.playInteraction(interaction.id)
              }
            >
              <MessageCircleIcon />
              {t("tools.students.detail.memorialLobby.talk", {
                index: interaction.index,
              })}
            </Button>
          ))} */}
        </div>
      )}
    </div>
  );
}
