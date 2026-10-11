import "server-only";

import blueStar from "@/assets/images/blue_star.png?og-asset";
import charBg from "@/assets/images/char-bg.png?og-asset";
import roleAttacker from "@/assets/images/role_attacker.png?og-asset";
import roleHealer from "@/assets/images/role_healer.png?og-asset";
import roleSupport from "@/assets/images/role_support.png?og-asset";
import roleTacticalSupport from "@/assets/images/role_tactical_support.png?og-asset";
import roleTank from "@/assets/images/role_tank.png?og-asset";
import yellowStar from "@/assets/images/yellow_star.png?og-asset";

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

const assets: OgAssetUrls = {
  charBg,
  yellowStar,
  blueStar,
  roleAttacker,
  roleHealer,
  roleSupport,
  roleTank,
  roleTacticalSupport,
};

export function getOgAssetUrls(): OgAssetUrls {
  return assets;
}
