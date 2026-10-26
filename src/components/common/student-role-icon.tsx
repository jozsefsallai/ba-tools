import type { Student } from "@/lib/types";

import damageDealer from "@/assets/images/role/DamageDealer.png";
import healer from "@/assets/images/role/Healer.png";
import supporter from "@/assets/images/role/Supporter.png";
import tanker from "@/assets/images/role/Tanker.png";
import vehicle from "@/assets/images/role/Vehicle.png";
import { MaskIcon } from "@/components/common/mask-icon";
import { TintedImage } from "@/components/common/tinted-image";

export type StudentRoleIconProps = {
  student: Pick<Student, "combatRole">;
  /**
   * A fixed color baked into an `<img>`, for places that get exported with
   * html2canvas. Without it the icon follows the text color.
   */
  tint?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

function getRoleIcon(combatRole: Student["combatRole"]) {
  switch (combatRole) {
    case "DamageDealer":
      return damageDealer;
    case "Healer":
      return healer;
    case "Supporter":
      return supporter;
    case "Tanker":
      return tanker;
    case "Vehicle":
      return vehicle;
  }
}

export function StudentRoleIcon({
  student,
  tint,
  ...props
}: StudentRoleIconProps) {
  const roleIcon = getRoleIcon(student.combatRole);

  if (tint) {
    return (
      <TintedImage
        src={roleIcon.src}
        tint={tint}
        alt={student.combatRole ?? ""}
        className={props.className}
        style={props.style}
      />
    );
  }

  return (
    <MaskIcon {...props} src={roleIcon.src} label={student.combatRole ?? ""} />
  );
}
