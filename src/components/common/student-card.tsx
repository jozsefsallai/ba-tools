import charBg from "@/assets/images/char-bg.png";
import iconAssist from "@/assets/images/icon_assist.png";

import { StudentRoleIcon } from "@/components/common/student-role-icon";
import { StudentStar } from "@/components/common/student-star";
import { type SkillCardVariant, skillCardVariantMap } from "@/lib/skill-card";

import type { StarLevel, Student, UELevel } from "@/lib/types";
import { buildSkillPortraitUrl, buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type StudentCardProps = {
  student: Student;
  noDisplayRole?: boolean;
  level?: number;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  borrowed?: boolean;
  starter?: boolean;
  busy?: boolean;
  variantId?: string;
  style?: React.CSSProperties;
  isSkillCard?: boolean;
};

export function StudentCard({
  student,
  noDisplayRole,
  level,
  starLevel,
  ueLevel,
  borrowed,
  starter,
  busy,
  variantId,
  style,
  isSkillCard,
}: StudentCardProps) {
  const isFirefox =
    typeof window !== "undefined" &&
    /firefox/i.test(window.navigator.userAgent);

  const iconUrl = useMemo(() => {
    const fallback = isSkillCard
      ? buildSkillPortraitUrl(student)
      : buildStudentIconUrl(student);

    if (!variantId) {
      return fallback;
    }

    const variant = skillCardVariantMap[student.id as SkillCardVariant];
    if (!variant) {
      return fallback;
    }

    return variant.find((v) => v.id === variantId)?.image ?? fallback;
  }, [student, variantId]);

  return (
    <div className="flex relative" style={style}>
      <div
        className={cn("skew-x-[-11deg] p-[2px]", {
          "rounded-[11%]": !isSkillCard,
          "rounded-[2px]": isSkillCard,
          "p-[2px] bg-[#ffff4d]": starter,
          "p-[1px] bg-white": !starter,
          "p-[2px]": isSkillCard,
        })}
      >
        <div
          className={cn(
            "flex relative h-[86px] w-[93px] p-[2px] overflow-hidden",
            {
              "rounded-[11%] pb-[10px]": !isSkillCard,
              "rounded-[2px]": isSkillCard,
              "bg-type-red": student.attackType === "Explosion",
              "bg-type-yellow": student.attackType === "Pierce",
              "bg-type-blue": student.attackType === "Mystic",
              "bg-type-purple": student.attackType === "Sonic",
            },
          )}
        >
          {!isSkillCard && (
            <div
              className="flex w-full h-full bg-cover rounded-[11%]"
              style={{ backgroundImage: `url(${charBg.src})` }}
            />
          )}

          <div
            className={cn("absolute  overflow-hidden", {
              "top-[2px] left-[2px] right-[2px] bottom-[10px] rounded-[11%]":
                !isSkillCard,
              "top-0 left-0 right-0 bottom-0 rounded-[2px]": isSkillCard,
            })}
          >
            <img
              src={iconUrl}
              alt={student.name}
              width={isSkillCard ? 107 : 102}
              className={cn("max-w-none skew-x-[11deg]", {
                "ml-[-6px]": !isSkillCard,
                "ml-[-8px]": isSkillCard,
              })}
            />
          </div>

          {!noDisplayRole && (
            <div className="absolute bottom-[2px] right-[2px] bg-white rounded-tl-[8px] rounded-br-[8px] flex items-center justify-center w-6 h-6">
              <StudentRoleIcon
                student={student}
                className="w-4 h-4 skew-x-[11deg]"
              />
            </div>
          )}

          {(starLevel || ueLevel) && (
            <StudentStar
              starLevel={starLevel}
              ueLevel={ueLevel}
              containerClassName="w-[24px] h-[24px] absolute bottom-[2px] left-[2px] skew-x-[11deg]"
              textClassName={cn({
                "mt-[2px]": !isFirefox || !busy,
                "mt-[3px]": !isFirefox && busy,
              })}
            />
          )}

          {(level ?? 0) > 0 && (
            <div
              className="flex absolute top-0 left-[5px] text-[15px] text-white font-bold"
              style={{
                textShadow:
                  "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
              }}
            >
              Lv.{level}
            </div>
          )}
        </div>
      </div>

      {borrowed && (
        <img
          alt="A"
          src={iconAssist.src}
          className="absolute top-[-3px] right-0 h-[26px]"
        />
      )}
    </div>
  );
}
