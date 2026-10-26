"use client";

import { type ComponentProps, useState } from "react";

type FallbackImageProps = Omit<ComponentProps<"img">, "src"> & {
  src: string;
  fallbackSrc?: string;
};

export function FallbackImage({
  src,
  fallbackSrc,
  alt,
  ...props
}: FallbackImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const currentSrc = failedSrc === src ? fallbackSrc : src;
  if (!currentSrc) {
    return null;
  }

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (currentSrc === src) {
          setFailedSrc(src);
        }
      }}
    />
  );
}
