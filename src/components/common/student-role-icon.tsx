import type { Student } from "@/lib/types";

import attacker from "@/assets/images/role_attacker.png";
import healer from "@/assets/images/role_healer.png";
import support from "@/assets/images/role_support.png";
import tank from "@/assets/images/role_tank.png";
import ts from "@/assets/images/role_tactical_support.png";

export type StudentRoleIconProps = {
  student: Student;
} & React.HTMLAttributes<HTMLImageElement>;

export function StudentRoleIcon({ student, ...props }: StudentRoleIconProps) {
  let roleIcon = null;

  switch (student.combatRole) {
    case "DamageDealer":
      roleIcon = attacker;
      break;
    case "Healer":
      roleIcon = healer;
      break;
    case "Supporter":
      roleIcon = support;
      break;
    case "Tanker":
      roleIcon = tank;
      break;
    case "Vehicle":
      roleIcon = ts;
      break;
  }

  if (!roleIcon) {
    return null;
  }

  return <img {...props} src={roleIcon.src} alt={student.combatRole ?? ""} />;
}
