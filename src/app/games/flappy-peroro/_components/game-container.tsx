"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FullscreenIcon, MinimizeIcon } from "lucide-react";
import Script from "next/script";
import { useState } from "react";

export default function FlappyPeroroGameContainer() {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div
        className={cn({
          "fixed inset-0 bg-black flex items-center justify-center z-50":
            fullscreen,
        })}
      >
        <div
          className={cn(
            "mx-auto relative aspect-[10/16] flex items-center justify-center",
            {
              "h-[960px] max-h-screen": !fullscreen,
              "w-full h-full max-w-[62.5vh] max-h-[160vw]": fullscreen,
            },
          )}
        >
          <canvas
            id="unity-canvas"
            className="mx-auto w-full h-full object-cover"
          />

          <Button
            variant="ghost"
            onClick={() => setFullscreen(!fullscreen)}
            className={cn({
              "absolute top-0 -right-14": !fullscreen,
              "fixed top-4 right-4 z-50": fullscreen,
            })}
          >
            {fullscreen && <MinimizeIcon />}
            {!fullscreen && <FullscreenIcon />}
          </Button>
        </div>
      </div>

      <Script src="/assets/scripts/flappy-peroro.js" />
    </>
  );
}
