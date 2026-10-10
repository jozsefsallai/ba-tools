import "server-only";

import fs from "node:fs";
import path from "node:path";

import type { OgIconName, OgVariant } from "@/lib/og/registry";

export const VARIANT_ICONS: Partial<Record<OgVariant, OgIconName>> = {
  formation: "users",
  timeline: "list-ordered",
  bond: "heart",
  probability: "dices",
  progress: "calculator",
  railway: "train-track",
  chat: "message-circle-heart",
  birthday: "cake",
  banner: "gem",
  game: "gamepad",
  scene: "book-open-text",
  inventory: "grid-2x2",
};

const cache = new Map<OgIconName, string>();

export function lucideOgIcon(name: OgIconName) {
  const cached = cache.get(name);

  if (cached) {
    return cached;
  }

  const svg = fs.readFileSync(
    path.join(process.cwd(), "src/assets/og-icons", `${name}.svg`),
  );

  const url = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  cache.set(name, url);

  return url;
}
