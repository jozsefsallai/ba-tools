import type { Student } from "@/lib/types";

import badge from "@/assets/images/equipment/Badge.png";
import bag from "@/assets/images/equipment/Bag.png";
import charm from "@/assets/images/equipment/Charm.png";
import gloves from "@/assets/images/equipment/Gloves.png";
import hairpin from "@/assets/images/equipment/Hairpin.png";
import hat from "@/assets/images/equipment/Hat.png";
import necklace from "@/assets/images/equipment/Necklace.png";
import shoes from "@/assets/images/equipment/Shoes.png";
import watch from "@/assets/images/equipment/Watch.png";

export type EquipmentKind = Student["equipment"][number];

const EQUIPMENT_ICONS = {
  Badge: badge,
  Bag: bag,
  Charm: charm,
  Gloves: gloves,
  Hairpin: hairpin,
  Hat: hat,
  Necklace: necklace,
  Shoes: shoes,
  Watch: watch,
} satisfies Record<EquipmentKind, { src: string }>;

export type EquipmentIconProps = {
  equipment: EquipmentKind;
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">;

export function EquipmentIcon({
  equipment,
  alt = "",
  ...props
}: EquipmentIconProps) {
  return <img {...props} src={EQUIPMENT_ICONS[equipment].src} alt={alt} />;
}
