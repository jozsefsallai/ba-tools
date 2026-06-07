import type { OgAssetUrls } from "@/lib/og-assets.server";
import type { StarLevel, UELevel } from "@/lib/types";
import type { AttackType, CombatRole } from "~prisma";

export type OgFeaturedStudent = {
  iconUrl: string;
  level: number;
  starLevel: StarLevel;
  ueLevel?: UELevel;
  attackType: AttackType;
  combatRole: CombatRole;
};

const ATTACK_TYPE_COLORS: Record<AttackType, string> = {
  Explosion: "#930008",
  Pierce: "#bf8901",
  Mystic: "#226f9c",
  Sonic: "#794394",
  Chemical: "#11736b",
  Normal: "#52525c",
  Mixed: "#52525c",
};

const SCALE = 0.82;

function dim(value: number) {
  return Math.round(value * SCALE);
}

// StudentCard at ~82% scale
const INNER_WIDTH = dim(93);
const INNER_HEIGHT = dim(86);
const INNER_PADDING = dim(2);
const INNER_PADDING_BOTTOM = dim(10);
const CONTENT_WIDTH = INNER_WIDTH - INNER_PADDING * 2;
const CONTENT_HEIGHT = INNER_HEIGHT - INNER_PADDING - INNER_PADDING_BOTTOM;
const WHITE_BORDER = 1;
const CARD_WIDTH = INNER_WIDTH + WHITE_BORDER * 2;
const CARD_HEIGHT = INNER_HEIGHT + WHITE_BORDER * 2;
// Skew adds a little horizontal overflow; keep slot tight so flex gap reads correctly.
const SLOT_WIDTH = CARD_WIDTH + dim(6);
const SLOT_HEIGHT = CARD_HEIGHT;
const PORTRAIT_WIDTH = dim(102);
const PORTRAIT_OFFSET = dim(6);
const STAR_SIZE = dim(24);
const ROLE_SIZE = dim(24);
const ROLE_ICON_SIZE = dim(16);

const TEXT_SHADOW =
  "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)";

function getRoleIconUrl(combatRole: CombatRole, assets: OgAssetUrls): string {
  switch (combatRole) {
    case "DamageDealer":
      return assets.roleAttacker;
    case "Healer":
      return assets.roleHealer;
    case "Supporter":
      return assets.roleSupport;
    case "Tanker":
      return assets.roleTank;
    case "Vehicle":
      return assets.roleTacticalSupport;
  }
}

export type OgStudentCardProps = {
  student: OgFeaturedStudent;
  assets: OgAssetUrls;
};

export function OgStudentCard({ student, assets }: OgStudentCardProps) {
  const starImage = student.ueLevel ? assets.blueStar : assets.yellowStar;
  const starValue = student.ueLevel ?? student.starLevel;
  const roleIconUrl = getRoleIconUrl(student.combatRole, assets);
  const attackColor = ATTACK_TYPE_COLORS[student.attackType];

  return (
    <div
      tw="flex relative"
      style={{
        width: SLOT_WIDTH,
        height: SLOT_HEIGHT,
      }}
    >
      <div
        tw="flex"
        style={{
          transform: "skewX(-11deg)",
          padding: WHITE_BORDER,
          backgroundColor: "#ffffff",
          borderRadius: "11%",
          boxSizing: "border-box",
        }}
      >
        <div
          tw="flex relative"
          style={{
            width: INNER_WIDTH,
            height: INNER_HEIGHT,
            paddingTop: INNER_PADDING,
            paddingRight: INNER_PADDING,
            paddingBottom: INNER_PADDING_BOTTOM,
            paddingLeft: INNER_PADDING,
            backgroundColor: attackColor,
            borderRadius: "11%",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <img
            src={assets.charBg}
            alt=""
            style={{
              position: "absolute",
              top: INNER_PADDING,
              left: INNER_PADDING,
              width: CONTENT_WIDTH,
              height: CONTENT_HEIGHT,
              borderRadius: "11%",
              objectFit: "cover",
            }}
          />

          <div
            tw="flex"
            style={{
              position: "absolute",
              top: INNER_PADDING,
              left: INNER_PADDING,
              width: CONTENT_WIDTH,
              height: CONTENT_HEIGHT,
              overflow: "hidden",
              borderRadius: "11%",
            }}
          >
            <img
              src={student.iconUrl}
              alt=""
              style={{
                width: PORTRAIT_WIDTH,
                marginLeft: -PORTRAIT_OFFSET,
                transform: "skewX(11deg)",
              }}
            />
          </div>

          {student.level > 0 && (
            <div
              tw="flex"
              style={{
                position: "absolute",
                top: 0,
                left: dim(5),
                fontSize: dim(15),
                fontWeight: 700,
                color: "#ffffff",
                textShadow: TEXT_SHADOW,
              }}
            >
              Lv.{student.level}
            </div>
          )}

          {(student.starLevel || student.ueLevel) && (
            <div
              tw="flex relative"
              style={{
                position: "absolute",
                bottom: INNER_PADDING,
                left: INNER_PADDING,
                width: STAR_SIZE,
                height: STAR_SIZE,
                transform: "skewX(11deg)",
              }}
            >
              <img
                src={starImage}
                alt=""
                style={{
                  width: STAR_SIZE,
                  height: STAR_SIZE,
                }}
              />

              <div
                tw="flex items-center justify-center font-semibold"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: STAR_SIZE,
                  height: STAR_SIZE,
                  fontFamily: "Nexon Football Gothic",
                  fontSize: dim(17),
                  lineHeight: 1,
                  transform: "skewX(-11deg)",
                  color: student.ueLevel ? "#273c60" : "#592c13",
                }}
              >
                {starValue}
              </div>
            </div>
          )}

          <div
            tw="flex items-center justify-center"
            style={{
              position: "absolute",
              bottom: INNER_PADDING,
              right: INNER_PADDING,
              width: ROLE_SIZE,
              height: ROLE_SIZE,
              backgroundColor: "#ffffff",
              borderTopLeftRadius: dim(8),
              borderBottomRightRadius: dim(8),
            }}
          >
            <img
              src={roleIconUrl}
              alt=""
              style={{
                width: ROLE_ICON_SIZE,
                height: ROLE_ICON_SIZE,
                transform: "skewX(11deg)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
