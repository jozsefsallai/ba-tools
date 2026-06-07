import fs from "node:fs";
import path from "node:path";

const cache = new Map<string, string>();

function getOgAssetDataUrl(filename: string): string {
  const cached = cache.get(filename);

  if (cached) {
    return cached;
  }

  const filePath = path.join(process.cwd(), "src/assets/images", filename);
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).slice(1);
  const mime = ext === "png" ? "image/png" : "image/webp";
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  cache.set(filename, dataUrl);

  return dataUrl;
}

export type OgAssetUrls = {
  charBg: string;
  yellowStar: string;
  blueStar: string;
  roleAttacker: string;
  roleHealer: string;
  roleSupport: string;
  roleTank: string;
  roleTacticalSupport: string;
};

export function getOgAssetUrls(): OgAssetUrls {
  return {
    charBg: getOgAssetDataUrl("char-bg.png"),
    yellowStar: getOgAssetDataUrl("yellow_star.png"),
    blueStar: getOgAssetDataUrl("blue_star.png"),
    roleAttacker: getOgAssetDataUrl("role_attacker.png"),
    roleHealer: getOgAssetDataUrl("role_healer.png"),
    roleSupport: getOgAssetDataUrl("role_support.png"),
    roleTank: getOgAssetDataUrl("role_tank.png"),
    roleTacticalSupport: getOgAssetDataUrl("role_tactical_support.png"),
  };
}
