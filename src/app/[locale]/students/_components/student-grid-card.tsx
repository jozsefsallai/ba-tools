import {
  getAttackTypeColorClass,
  getDefenseTypeColorClass,
} from "@/app/[locale]/students/_lib/student-display";
import { SchoolLogo } from "@/components/common/school-logo";
import { StudentRoleIcon } from "@/components/common/student-role-icon";
import { Link } from "@/i18n/navigation";
import { buildStudentPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { ShieldIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Student } from "~prisma";

export type StudentGridCardProps = {
  student: Pick<
    Student,
    | "id"
    | "name"
    | "rarity"
    | "attackType"
    | "defenseType"
    | "combatRole"
    | "school"
  >;
  subtitle?: string;
  title?: string;
  /** Shown in place of the name, e.g. the value being sorted by. */
  label?: ReactNode;
};

const REVEAL_CLASS =
  "opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none";

const DARK_BADGE_CLASS = "bg-black/65 shadow-sm ring-1 ring-black/10";

const BADGE_CLASS =
  "flex size-6 items-center justify-center rounded-md text-white shadow-sm ring-1 ring-black/10";

export function StudentGridCard({
  student,
  subtitle,
  title,
  label,
}: StudentGridCardProps) {
  return (
    <Link
      href={`/students/${student.id}`}
      title={title ?? student.name}
      className="group bg-muted flex h-full flex-col overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5 outline-none transition duration-200 hover:shadow-lg hover:ring-2 hover:ring-sky-400/70 focus-visible:ring-[3px] focus-visible:ring-sky-400 dark:ring-white/10"
    >
      <div className="relative aspect-[404/456] overflow-hidden">
        <img
          src={buildStudentPortraitUrl(student)}
          alt={student.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />

        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          <span
            className={cn(
              BADGE_CLASS,
              getAttackTypeColorClass(student.attackType),
            )}
          >
            <StudentRoleIcon student={student} className="size-4" />
          </span>

          <span
            className={cn(
              BADGE_CLASS,
              getDefenseTypeColorClass(student.defenseType),
              REVEAL_CLASS,
              "-translate-x-1",
            )}
          >
            <ShieldIcon className="size-3.5" strokeWidth={2.5} />
          </span>

          <span
            className={cn(
              BADGE_CLASS,
              DARK_BADGE_CLASS,
              REVEAL_CLASS,
              "-translate-x-1 delay-50",
            )}
          >
            <SchoolLogo school={student.school} className="h-4 w-[18px]" />
          </span>
        </div>

        <span
          role="img"
          aria-label={"★".repeat(student.rarity)}
          className={cn(
            "absolute top-1.5 right-1.5 flex h-6 items-center rounded-md px-1.5 text-sm leading-none tracking-tight text-yellow-300",
            DARK_BADGE_CLASS,
            REVEAL_CLASS,
            "translate-x-1",
          )}
        >
          {"★".repeat(student.rarity)}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center bg-zinc-950 px-1.5 py-1.5 text-center text-white">
        <span className="line-clamp-2 text-sm font-semibold leading-tight">
          {label ?? student.name}
        </span>
        {subtitle && (
          <span className="truncate text-xs leading-tight text-white/70">
            {subtitle}
          </span>
        )}
      </div>
    </Link>
  );
}
