import attackIcon from "@/assets/images/attack-icon.png";
import defenseIcon from "@/assets/images/defense-icon.png";
import loseText from "@/assets/images/pvp-lose.png";
import winText from "@/assets/images/pvp-win.png";

import type { PvpPixelImage } from "@/lib/pvp";
import type { PvpStatusTemplates } from "@/lib/pvp/status-match";

let loading: Promise<PvpStatusTemplates> | null = null;

async function decode(src: string): Promise<PvpPixelImage> {
  const image = new Image();
  image.src = src;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is unavailable.");
  }

  context.drawImage(image, 0, 0);

  return {
    width: canvas.width,
    height: canvas.height,
    pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
  };
}

export function loadPvpStatusTemplates(): Promise<PvpStatusTemplates> {
  loading ??= Promise.all(
    [attackIcon, defenseIcon, winText, loseText].map((asset) =>
      decode(asset.src),
    ),
  )
    .then(([attack, defense, win, lose]) => ({ attack, defense, win, lose }))
    .catch((error) => {
      loading = null;
      throw error;
    });

  return loading;
}
