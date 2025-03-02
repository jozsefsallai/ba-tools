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

  switch (student.combat_role) {
    case "attacker":
      roleIcon = attacker;
      break;
    case "healer":
      roleIcon = healer;
      break;
    case "support":
      roleIcon = support;
      break;
    case "tank":
      roleIcon = tank;
      break;
    case "t_s_":
      roleIcon = ts;
      break;
  }

  if (!roleIcon) {
    return null;
  }

  return <img {...props} src={roleIcon.src} alt={student.combat_role ?? ""} />;
}
