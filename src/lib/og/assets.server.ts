import "server-only";

import fs from "node:fs";
import path from "node:path";

export function localOgAsset(relativePath: string) {
  const buffer = fs.readFileSync(path.join(process.cwd(), relativePath));
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export const planaMark = localOgAsset("src/assets/plana-icon.png");

export const planaArt = localOgAsset("src/assets/images/plana.png");
