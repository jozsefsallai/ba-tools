"use client";

import { useEffect, useState } from "react";

const tintCache = new Map<string, Promise<string>>();

// Recolors every opaque pixel of the image, keeping its alpha.
function tintImage(src: string, color: string) {
  const key = `${src}|${color}`;

  let tinted = tintCache.get(key);

  if (!tinted) {
    tinted = new Promise<string>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D is unavailable"));
          return;
        }

        ctx.drawImage(image, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/png"));
      };

      image.onerror = reject;
      image.src = src;
    });

    tintCache.set(key, tinted);
  }

  return tinted;
}

export type TintedImageProps = {
  src: string;
  tint: string;
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">;

/**
 * A recolored copy of a single-color image as a plain `<img>`. Unlike
 * `MaskIcon`, it survives html2canvas, which can't draw CSS masks.
 */
export function TintedImage({
  src,
  tint,
  alt = "",
  ...props
}: TintedImageProps) {
  const [tinted, setTinted] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    tintImage(src, tint)
      .then((url) => {
        if (!cancelled) {
          setTinted(url);
        }
      })
      .catch((err) => console.error("Failed to tint image", err));

    return () => {
      cancelled = true;
    };
  }, [src, tint]);

  if (!tinted) {
    return null;
  }

  return <img {...props} src={tinted} alt={alt} />;
}
