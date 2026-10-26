import { StudentSpriteCarousel } from "@/app/[locale]/students/[id]/_components/student-sprite-carousel";
import type { StudentDetail } from "@/app/[locale]/students/[id]/_lib/student-detail.server";
import {
  GAME_SERVER_KEYS,
  getAcquisitionKind,
  getAttackTypeColorClass,
  getDefenseTypeColorClass,
  getLocalizedStudentNames,
  isReleasedOn,
} from "@/app/[locale]/students/_lib/student-display";
import charBg from "@/assets/images/char-bg.png";
import yellowStar from "@/assets/images/yellow_star.png";
import { FallbackImage } from "@/components/common/fallback-image";
import { Hint } from "@/components/common/hint";
import { Pill } from "@/components/common/pill";
import { SchoolLogo } from "@/components/common/school-logo";
import { StudentRoleIcon } from "@/components/common/student-role-icon";
import { buildStudentIconUrl, buildStudentPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { ShieldIcon, SwordIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function StudentSpritePanel({
  student,
}: {
  student: StudentDetail;
}) {
  const locale = await getLocale();

  const { name } = getLocalizedStudentNames(student, locale);

  return (
    <StudentSpriteCarousel
      studentId={student.id}
      name={name}
      fallbackSrc={buildStudentPortraitUrl(student)}
    />
  );
}

export async function StudentHeader({ student }: { student: StudentDetail }) {
  const t = await getTranslations();
  const locale = await getLocale();

  const { name } = getLocalizedStudentNames(student, locale);

  const clubKey = `common.club.${student.club}` as const;
  const clubLabel = t.has(clubKey) ? t(clubKey) : student.club;

  const acquisition = getAcquisitionKind(student, "jp");
  const releasedServers = GAME_SERVER_KEYS.filter((server) =>
    isReleasedOn(student, server),
  );

  return (
    <section className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-6">
            <div className="shrink-0 skew-x-[-11deg] rounded-[11%] bg-white p-px shadow-sm">
              <div
                className={cn(
                  "relative h-[86px] w-[93px] rounded-[11%] p-0.5 pb-2.5 md:h-[100px] md:w-[108px]",
                  getAttackTypeColorClass(student.attackType),
                )}
              >
                <div
                  className="h-full w-full rounded-[11%] bg-cover"
                  style={{ backgroundImage: `url(${charBg.src})` }}
                />

                <div className="absolute top-0.5 right-0.5 bottom-2.5 left-0.5 overflow-hidden rounded-[11%]">
                  <FallbackImage
                    src={buildStudentIconUrl(student)}
                    alt=""
                    aria-hidden
                    className="h-full w-full max-w-none scale-110 skew-x-[11deg] object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="flex gap-0.5"
                  role="img"
                  aria-label={"★".repeat(student.rarity)}
                >
                  {Array.from({ length: student.rarity }, (_, idx) => (
                    <img
                      key={idx}
                      src={yellowStar.src}
                      alt=""
                      aria-hidden
                      className="w-7"
                    />
                  ))}
                </div>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    {
                      "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300":
                        acquisition === "limited" || acquisition === "fest",
                      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300":
                        acquisition === "archive",
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300":
                        acquisition === "welfare",
                      "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300":
                        acquisition === "permanent",
                    },
                  )}
                >
                  {t(`tools.students.acquisition.${acquisition}`)}
                </span>
              </div>

              <h1 className="font-nexon-football-gothic text-4xl font-bold italic leading-none md:text-5xl">
                {name}
              </h1>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <SchoolLogo
              school={student.school}
              className="text-foreground/80 h-10 w-11"
            />

            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">
                {t(`common.school.${student.school}`)}
              </span>

              {student.club !== "EmptyClub" && (
                <span className="text-muted-foreground text-sm">
                  {clubLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Hint label={t("tools.students.detail.pills.attackType")}>
            <Pill
              variant="solid"
              icon={SwordIcon}
              className={getAttackTypeColorClass(student.attackType)}
            >
              {t(`common.attackType.${student.attackType}`)}
            </Pill>
          </Hint>

          <Hint label={t("tools.students.detail.pills.defenseType")}>
            <Pill
              variant="solid"
              icon={ShieldIcon}
              className={getDefenseTypeColorClass(student.defenseType)}
            >
              {t(`common.defenseType.${student.defenseType}`)}
            </Pill>
          </Hint>

          <Hint label={t("tools.students.detail.pills.combatRole")}>
            <Pill>
              <StudentRoleIcon student={student} className="size-5" />
              {t(`common.combatRole.${student.combatRole}`)}
            </Pill>
          </Hint>

          <Hint label={t("tools.students.detail.pills.combatClass")}>
            <Pill
              variant="solid"
              className={
                student.combatClass === "Main" ? "bg-type-red" : "bg-type-blue"
              }
            >
              {t(`common.combatClass.${student.combatClass}`)}
            </Pill>
          </Hint>

          <Hint label={t("tools.students.detail.pills.combatPosition")}>
            <Pill>{t(`common.combatPosition.${student.combatPosition}`)}</Pill>
          </Hint>

          <Hint label={t(`common.weaponType.${student.weaponType}`)}>
            <Pill className="font-bold">{student.weaponType}</Pill>
          </Hint>
        </div>

        {releasedServers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("tools.students.detail.availability")}
            </span>

            {releasedServers.map((server) => (
              <span
                key={server}
                className="rounded-md border bg-sky-50 px-2 py-0.5 text-xs font-semibold dark:bg-sky-950/40"
              >
                {t(`tools.students.servers.${server}`)}
              </span>
            ))}
          </div>
        )}
      </div>

      <FallbackImage
        src={buildStudentPortraitUrl(student)}
        alt={name}
        className="hidden h-44 w-auto shrink-0 drop-shadow-lg sm:block xl:h-52"
      />
    </section>
  );
}
