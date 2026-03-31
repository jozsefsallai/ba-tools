"use client";

import { useEffect, useRef } from "react";
import { Neko } from "neko-ts";

export function Oneko() {
  const oneko = useRef<Neko>(undefined);

  useEffect(() => {
    if (!oneko.current) {
      oneko.current = new Neko({
        origin: {
          x: 0,
          y: 0,
        },
      });
    }
  }, [oneko]);

  return null;
}
