"use client";

import { FallbackImage } from "@/components/common/fallback-image";
import { Button } from "@/components/ui/button";
import { fetchStudentSprites } from "@/lib/student-spine";
import { buildStudentDefaultSpriteUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  LayoutGridIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

export type StudentSprite = {
  key: string;
  url: string;
};

type StudentSpriteCarouselProps = {
  studentId: string;
  name: string;
  fallbackSrc: string;
};

const DEFAULT_SPRITE_KEY = "00";

function getDefaultSprites(studentId: string): StudentSprite[] {
  return [
    { key: DEFAULT_SPRITE_KEY, url: buildStudentDefaultSpriteUrl(studentId) },
  ];
}

/** Where the face sits in the sprites, to frame wide ones around the head. */
type SpriteFraming = {
  /** The face's horizontal center, as a fraction of the sprite's width. */
  focusX: number;
  /** Sprite width divided by height. */
  aspect: number;
};

async function fetchSprites(studentId: string): Promise<{
  sprites: StudentSprite[];
  framing: SpriteFraming | null;
}> {
  const manifest = await fetchStudentSprites(studentId);
  if (!manifest || manifest.sprites.length === 0) {
    return { sprites: getDefaultSprites(studentId), framing: null };
  }

  const keys = [
    ...manifest.sprites.filter((key) => key === DEFAULT_SPRITE_KEY),
    ...manifest.sprites.filter((key) => key !== DEFAULT_SPRITE_KEY),
  ];

  return {
    sprites: keys.map((key) => ({ key, url: manifest.urls[key] })),
    framing: manifest.face
      ? {
          focusX: manifest.face.x / manifest.width,
          aspect: manifest.width / manifest.height,
        }
      : null,
  };
}

function getFramedStyle({ focusX, aspect }: SpriteFraming): CSSProperties {
  const width = `(100cqh * ${aspect})`;
  const gap = `(100cqw - ${width})`;

  return {
    left: `clamp(min(0px, calc${gap}), calc(50cqw - ${width} * ${focusX}), max(0px, calc${gap}))`,
  };
}

const OVERLAY_CLASS =
  "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

const OVERLAY_BUTTON_CLASS = "bg-background/80 rounded-full backdrop-blur";

const OVERLAY_ENTER_CLASS = "animate-in fade-in zoom-in-75 duration-300";

async function fetchSpriteAsPng(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const bitmap = await createImageBitmap(await response.blob());

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);

  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))),
      "image/png",
    );
  });
}

export function StudentSpriteCarousel({
  studentId,
  name,
  fallbackSrc,
}: StudentSpriteCarouselProps) {
  const t = useTranslations();

  const [sprites, setSprites] = useState(() => getDefaultSprites(studentId));
  const [framing, setFraming] = useState<SpriteFraming | null>(null);
  const [isManifestLoaded, setIsManifestLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchSprites(studentId)
      .then((loaded) => {
        if (!cancelled) {
          setSprites(loaded.sprites);
          setFraming(loaded.framing);
        }
      })
      .catch((err) => console.error("Failed to load sprite manifest", err))
      .finally(() => {
        if (!cancelled) {
          setIsManifestLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const scrollerRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ startX: number; startScroll: number } | null>(null);

  const [index, setIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [hasOpenedGallery, setHasOpenedGallery] = useState(false);
  const [copied, setCopied] = useState(false);

  const total = sprites.length;
  const current = sprites[index] ?? sprites[0];

  const scrollToIndex = useCallback(
    (target: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current;
      if (!scroller) {
        return;
      }

      const clamped = Math.min(Math.max(target, 0), total - 1);
      scroller.scrollTo({
        left: clamped * scroller.clientWidth,
        behavior,
      });
    },
    [total],
  );

  function toggleGallery() {
    if (hasOpenedGallery) {
      setIsGalleryOpen((open) => !open);
      return;
    }

    setHasOpenedGallery(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setIsGalleryOpen(true)),
    );
  }

  function selectFromGallery(target: number) {
    setIsGalleryOpen(false);
    scrollToIndex(target, "instant");
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": fetchSpriteAsPng(current.url) }),
      ]);
    } catch (err) {
      console.error("Failed to copy sprite", err);
      toast.error(t("tools.students.detail.sprite.copyFailed"));
      return;
    }

    toast.success(t("tools.students.detail.sprite.copied"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientWidth === 0) {
      return;
    }

    setIndex(Math.round(scroller.scrollLeft / scroller.clientWidth));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollToIndex(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollToIndex(index + 1);
    }
  }

  // Touch and trackpad swipes are handled natively by scroll snapping; this
  // adds click-and-drag swiping for mice.
  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || total < 2) {
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    dragRef.current = {
      startX: event.clientX,
      startScroll: scroller.scrollLeft,
    };
    scroller.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const scroller = scrollerRef.current;
    if (!drag || !scroller) {
      return;
    }

    scroller.scrollLeft = drag.startScroll - (event.clientX - drag.startX);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const scroller = scrollerRef.current;
    if (!drag || !scroller) {
      return;
    }

    dragRef.current = null;
    setIsDragging(false);
    scroller.releasePointerCapture(event.pointerId);

    const delta = drag.startX - event.clientX;
    const startIndex = Math.round(drag.startScroll / scroller.clientWidth);
    const threshold = scroller.clientWidth * 0.15;

    if (delta > threshold) {
      scrollToIndex(startIndex + 1);
    } else if (delta < -threshold) {
      scrollToIndex(startIndex - 1);
    } else {
      scrollToIndex(startIndex);
    }
  }

  return (
    <div
      className="group bg-card relative h-[60svh] overflow-hidden rounded-2xl border lg:sticky lg:top-16 lg:h-[calc(100svh-5rem)]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isGalleryOpen) {
          setIsGalleryOpen(false);
        }
      }}
    >
      <section
        ref={scrollerRef}
        aria-roledescription="carousel"
        aria-label={name}
        aria-hidden={isGalleryOpen}
        tabIndex={isGalleryOpen ? -1 : 0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "flex h-full overflow-x-auto overscroll-x-contain outline-none transition duration-300 ease-out motion-reduce:transition-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isDragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory",
          total > 1 && !isDragging && "cursor-grab",
          isGalleryOpen && "scale-90 opacity-0",
        )}
      >
        {sprites.map((sprite, idx) => (
          <div
            key={sprite.key}
            className="relative h-full w-full shrink-0 snap-center overflow-hidden [container-type:size]"
          >
            <FallbackImage
              src={sprite.url}
              fallbackSrc={idx === 0 ? fallbackSrc : undefined}
              alt={name}
              draggable={false}
              loading={idx === 0 ? "eager" : "lazy"}
              fetchPriority={idx === 0 ? "high" : "auto"}
              // Without a face position, scaled to fit the box both ways so
              // wide sprites shrink instead of being cropped off-center.
              className={cn(
                "pointer-events-none absolute transition-opacity duration-200",
                framing
                  ? "top-0 h-full w-auto max-w-none"
                  : "inset-0 h-full w-full object-contain",
                !isManifestLoaded && "opacity-0",
              )}
              style={framing ? getFramedStyle(framing) : undefined}
            />
          </div>
        ))}
      </section>

      {!isManifestLoaded && (
        <div className="text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center">
          <LoaderCircleIcon className="size-6 animate-spin" />
        </div>
      )}

      {hasOpenedGallery && (
        <div
          aria-hidden={!isGalleryOpen}
          className={cn(
            "bg-card absolute inset-0 z-10 overflow-y-auto p-3 pt-14 transition-all duration-300 ease-out motion-reduce:transition-none",
            isGalleryOpen
              ? "visible scale-100 opacity-100"
              : "invisible scale-105 opacity-0",
          )}
        >
          <div className="grid grid-cols-3 gap-2">
            {sprites.map((sprite, idx) => (
              <button
                key={sprite.key}
                type="button"
                tabIndex={isGalleryOpen ? 0 : -1}
                onClick={() => selectFromGallery(idx)}
                aria-current={idx === index}
                aria-label={`${name} ${idx + 1}`}
                style={{
                  transitionDelay: isGalleryOpen
                    ? `${Math.min(idx, 12) * 25}ms, ${Math.min(idx, 12) * 25}ms, 0ms`
                    : undefined,
                }}
                className={cn(
                  "bg-muted/40 hover:bg-muted relative aspect-[3/4] overflow-hidden rounded-lg border transition-[opacity,translate,background-color] duration-300 ease-out motion-reduce:transition-none",
                  idx === index && "ring-primary ring-2",
                  isGalleryOpen ? "opacity-100" : "translate-y-3 opacity-0",
                )}
              >
                <FallbackImage
                  src={sprite.url}
                  fallbackSrc={idx === 0 ? fallbackSrc : undefined}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain p-1"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className={cn(
          "absolute top-3 right-3 z-20 flex items-center gap-1.5",
          // Keep the controls up while the gallery covers the hero, so it can
          // be closed.
          isGalleryOpen ? "opacity-100" : OVERLAY_CLASS,
        )}
      >
        {!isGalleryOpen && (
          <>
            {total > 1 && (
              <span className="bg-background/80 animate-in fade-in rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums backdrop-blur duration-300">
                {index + 1}/{total}
              </span>
            )}

            <Button
              variant="outline"
              size="icon-sm"
              className={cn(OVERLAY_BUTTON_CLASS, OVERLAY_ENTER_CLASS)}
              onClick={copyToClipboard}
              disabled={copied}
              title={t("tools.students.detail.sprite.copy")}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span className="sr-only">
                {t("tools.students.detail.sprite.copy")}
              </span>
            </Button>

            <Button
              asChild
              variant="outline"
              size="icon-sm"
              className={cn(OVERLAY_BUTTON_CLASS, OVERLAY_ENTER_CLASS)}
            >
              <a
                href={current.url}
                target="_blank"
                rel="noreferrer"
                title={t("tools.students.detail.sprite.open")}
              >
                <ExternalLinkIcon />
                <span className="sr-only">
                  {t("tools.students.detail.sprite.open")}
                </span>
              </a>
            </Button>
          </>
        )}

        {total > 1 && (
          <Button
            variant="outline"
            size="icon-sm"
            className={OVERLAY_BUTTON_CLASS}
            aria-pressed={isGalleryOpen}
            onClick={toggleGallery}
            title={
              isGalleryOpen
                ? t("tools.students.detail.sprite.closeGallery")
                : t("tools.students.detail.sprite.gallery")
            }
          >
            {isGalleryOpen ? (
              <XIcon key="close" className="animate-in spin-in-90 fade-in" />
            ) : (
              <LayoutGridIcon
                key="open"
                className="animate-in spin-in-90 fade-in"
              />
            )}
            <span className="sr-only">
              {isGalleryOpen
                ? t("tools.students.detail.sprite.closeGallery")
                : t("tools.students.detail.sprite.gallery")}
            </span>
          </Button>
        )}
      </div>

      {total > 1 && !isGalleryOpen && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollToIndex(index - 1)}
            disabled={index === 0}
            className={cn(
              "bg-background/80 absolute top-1/2 left-3 -translate-y-1/2 rounded-full backdrop-blur disabled:opacity-0",
              OVERLAY_CLASS,
              "[@media(hover:none)]:hidden",
            )}
          >
            <ChevronLeftIcon />
            <span className="sr-only">
              {t("tools.students.detail.sprite.previous")}
            </span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollToIndex(index + 1)}
            disabled={index === total - 1}
            className={cn(
              "bg-background/80 absolute top-1/2 right-3 -translate-y-1/2 rounded-full backdrop-blur disabled:opacity-0",
              OVERLAY_CLASS,
              "[@media(hover:none)]:hidden",
            )}
          >
            <ChevronRightIcon />
            <span className="sr-only">
              {t("tools.students.detail.sprite.next")}
            </span>
          </Button>
        </>
      )}
    </div>
  );
}
