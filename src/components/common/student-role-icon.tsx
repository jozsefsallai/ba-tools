import type { Student } from "@/lib/types";

import attacker from "@/assets/images/role_attacker.png";
import healer from "@/assets/images/role_healer.png";
import support from "@/assets/images/role_support.png";
import ts from "@/assets/images/role_tactical_support.png";
import tank from "@/assets/images/role_tank.png";

export type StudentRoleIconProps = {
  student: Pick<Student, "combatRole">;
} & React.HTMLAttributes<HTMLImageElement>;

function getRoleIcon(combatRole: Student["combatRole"]) {
  switch (combatRole) {
    case "DamageDealer":
      return attacker;
    case "Healer":
      return healer;
    case "Supporter":
      return support;
    case "Tanker":
      return tank;
    case "Vehicle":
      return ts;
  }
}

export function StudentRoleIcon({ student, ...props }: StudentRoleIconProps) {
  const roleIcon = getRoleIcon(student.combatRole);

  return <img {...props} src={roleIcon.src} alt={student.combatRole ?? ""} />;
}
