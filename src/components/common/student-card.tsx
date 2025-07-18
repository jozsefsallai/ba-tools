import charBg from "@/assets/images/char-bg.png";
import iconAssist from "@/assets/images/icon_assist.png";

import { StudentRoleIcon } from "@/components/common/student-role-icon";
import { StudentStar } from "@/components/common/student-star";

import type { StarLevel, Student, UELevel } from "@/lib/types";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

export type StudentCardProps = {
  student: Student;
  noDisplayRole?: boolean;
  level?: number;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  borrowed?: boolean;
  starter?: boolean;
  busy?: boolean;
  style?: React.CSSProperties;
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
  style,
}: StudentCardProps) {
  const isFirefox =
    typeof window !== "undefined" &&
    /firefox/i.test(window.navigator.userAgent);

  return (
    <div className="flex relative" style={style}>
      <div
        className={cn("skew-x-[-11deg] p-[2px] rounded-[11%]", {
          "p-[2px] bg-[#ffff4d]": starter,
          "p-[1px] bg-white": !starter,
        })}
      >
        <div
          className={cn(
            "flex relative h-[86px] w-[93px] rounded-[11%] p-[2px] pb-[10px] overflow-hidden",
            {
              "bg-type-red": student.attackType === "Explosion",
              "bg-type-yellow": student.attackType === "Pierce",
              "bg-type-blue": student.attackType === "Mystic",
              "bg-type-purple": student.attackType === "Sonic",
            },
          )}
        >
          <div
            className="flex w-full h-full bg-cover rounded-[11%]"
            style={{ backgroundImage: `url(${charBg.src})` }}
          />

          <div className="absolute top-[2px] left-[2px] right-[2px] bottom-[10px] overflow-hidden rounded-[11%]">
            <img
              src={buildStudentIconUrl(student)}
              alt={student.name}
              width={102}
              className="max-w-none skew-x-[11deg] ml-[-6px]"
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

          {level && (
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
