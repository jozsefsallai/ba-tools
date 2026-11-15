"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { type MouseEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

type Shot = {
  label: string;
  image: StaticImageData;
};

const LIGHTBOX_BUTTON_CLASS =
  "flex size-10 items-center justify-center rounded-full bg-black/50 text-white/80 transition-colors hover:bg-black/70 hover:text-white focus-visible:outline-2 focus-visible:outline-white";

export function BeforeAfter({
  before,
  after,
  alt,
}: {
  before: StaticImageData;
  after: StaticImageData;
  alt: string;
}) {
  const shots: Shot[] = [
    {
      label: "Before",
      image: before,
    },
    {
      label: "After",
      image: after,
    },
  ];

  const count = shots.length;
  const [isOpen, setIsOpen] = useState(false);

  // Kept while closing, so the image stays up as the lightbox fades out.
  const [index, setIndex] = useState(0);

  const altOf = (shot: Shot) => `${alt} (${shot.label.toLowerCase()})`;

  const step = (by: number) => setIndex((i) => (i + by + count) % count);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const by =
        event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;

      if (by !== 0) {
        event.preventDefault();
        setIndex((i) => (i + by + count) % count);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    count,
  ]);

  const current = shots[index];

  const closeOnBackdrop = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {shots.map((shot, shotIndex) => (
          <figure key={shot.label} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setIndex(shotIndex);
                setIsOpen(true);
              }}
              className="cursor-zoom-in overflow-hidden rounded-md border transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Image
                src={shot.image}
                alt={altOf(shot)}
                sizes="(min-width: 640px) 28rem, 100vw"
                className="h-auto w-full"
              />
            </button>

            <figcaption className="text-xs text-muted-foreground">
              {shot.label}
            </figcaption>
          </figure>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/90" />

          <DialogPrimitive.Content
            aria-describedby={undefined}
            onClick={closeOnBackdrop}
            className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4 duration-200 outline-none sm:px-16"
          >
            <DialogTitle className="sr-only">{altOf(current)}</DialogTitle>

            <Image
              key={current.label}
              src={current.image}
              alt={altOf(current)}
              sizes={`${current.image.width}px`}
              className="h-auto rounded-md"
              style={{
                // As large as fits next to the caption, up to its own size.
                width: `min(100%, ${current.image.width}px, calc((100dvh - 6rem) * ${current.image.width / current.image.height}))`,
              }}
            />

            <p className="text-sm text-white/80">
              {current.label}
              <span className="text-white/50">
                {" "}
                · {index + 1} / {count}
              </span>
            </p>

            <button
              type="button"
              onClick={() => step(-1)}
              className={`${LIGHTBOX_BUTTON_CLASS} absolute top-1/2 left-2 -translate-y-1/2 sm:left-4`}
            >
              <ChevronLeftIcon className="size-6" />
              <span className="sr-only">Previous image</span>
            </button>

            <button
              type="button"
              onClick={() => step(1)}
              className={`${LIGHTBOX_BUTTON_CLASS} absolute top-1/2 right-2 -translate-y-1/2 sm:right-4`}
            >
              <ChevronRightIcon className="size-6" />
              <span className="sr-only">Next image</span>
            </button>

            <DialogClose
              className={`${LIGHTBOX_BUTTON_CLASS} absolute top-2 right-2 sm:top-4 sm:right-4`}
            >
              <XIcon className="size-5" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
