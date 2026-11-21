import * as arrowBigUpModule from "lucide-react/icons/arrow-big-up";
import * as banModule from "lucide-react/icons/ban";
import * as doorClosedModule from "lucide-react/icons/door-closed";
import * as doorOpenModule from "lucide-react/icons/door-open";
import * as eyeModule from "lucide-react/icons/eye";
import * as flagModule from "lucide-react/icons/flag";
import * as footprintsModule from "lucide-react/icons/footprints";
import * as heartPlusModule from "lucide-react/icons/heart-plus";
import * as orbitModule from "lucide-react/icons/orbit";
import * as shieldModule from "lucide-react/icons/shield";
import * as swordsModule from "lucide-react/icons/swords";
import * as toggleLeftModule from "lucide-react/icons/toggle-left";
import * as toggleRightModule from "lucide-react/icons/toggle-right";
import { type CSSProperties, createElement, useId } from "react";
import {
  attackTypeStyle,
  defenseTypeStyle,
} from "@/app/[locale]/missions/_lib/team-damage";
import bossIcon from "@/assets/images/missions/Common_Icon_Enemy_Champion.png";
import enemyIcon from "@/assets/images/missions/Common_Icon_Enemy_Elite.png";
import type {
  HexCoord,
  MissionMapData,
  MissionMapObject,
  MissionMapUnit,
} from "@/lib/game-data/contract";
import { mainArmor } from "@/lib/missions/armor";
import { hexKey, hexToPixel } from "@/lib/missions/hex";
import { echelonName } from "@/lib/missions/labels";
import { isBoxObject, isStartObject } from "@/lib/missions/map-objects";
import type {
  EnemyAction,
  MissionAction,
  MissionSnapshot,
} from "@/lib/missions/solver";
import { buildGameItemIconUrl } from "@/lib/url";

type IconNode = [
  string,
  Record<string, string>,
][];

const iconNode = (module: object) =>
  (
    module as {
      __iconData: {
        node: IconNode;
      };
    }
  ).__iconData.node;

const ArrowBigUpIcon = iconNode(arrowBigUpModule);
const BanIcon = iconNode(banModule);
const DoorClosedIcon = iconNode(doorClosedModule);
const DoorOpenIcon = iconNode(doorOpenModule);
const EyeIcon = iconNode(eyeModule);
const FlagIcon = iconNode(flagModule);
const FootprintsIcon = iconNode(footprintsModule);
const HeartPlusIcon = iconNode(heartPlusModule);
const OrbitIcon = iconNode(orbitModule);
const ShieldIcon = iconNode(shieldModule);
const SwordsIcon = iconNode(swordsModule);
const ToggleLeftIcon = iconNode(toggleLeftModule);
const ToggleRightIcon = iconNode(toggleRightModule);

const R = 40;

const GEM = {
  width: R * 1.5,
  height: R * 1.5 * (456 / 578),
};

const MAX_SCALE = 1.75;

const ENEMY_RADIUS = 0.5;
const BOSS_RADIUS = 0.7;

const SLAB = R * 0.16;

const BOARD = {
  tile: "#cfe5fa",
  tileRim: "#f2f9ff",
  tileDetail: "#86c3ef",
  tileSlab: "#6f8fd6",
  start: "#dcefff",
  startRim: "#3d8eea",
  startDetail: "#3d8eea",
  startSlab: "#3f78d6",
  remove: "#f5d9ee",
  removeRim: "#f6a3d3",
  removeSlab: "#c77aa9",
  hidden: "#3a3f8f",
  hiddenDetail: "#6670c2",
  hiddenSlab: "#262a63",
  icon: "#2c5ea8",
  removeIcon: "#e0569e",
  revealIcon: "#2fa8de",
  team: "#ffd23f",
  teamPlate: "#fff4c7",
  enemyArrow: "#ff5a5f",
};

const OBJECT_ICONS: Partial<Record<MissionMapObject["type"], IconNode>> = {
  Heal: HeartPlusIcon,
  StatBuff: ArrowBigUpIcon,
  Portal: OrbitIcon,
  PortalOneWayEnterance: DoorOpenIcon,
  PortalOneWayExit: DoorClosedIcon,
  Observatory: EyeIcon,
};

const isBeacon = (o: MissionMapObject) =>
  o.type === "Beacon" || o.type === "BeaconOneTime";

const GRADE_PIPS: Record<MissionMapUnit["grade"], number> = {
  Grade1: 1,
  Grade2: 2,
  Grade3: 3,
  Boss: 0,
};

function hexCorners(cx: number, cy: number, r: number) {
  return Array.from(
    {
      length: 6,
    },
    (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return {
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
      };
    },
  );
}

function hexPath(cx: number, cy: number, r: number, round = 0.14) {
  const c = hexCorners(cx, cy, r);

  const lerp = (
    a: {
      x: number;
      y: number;
    },
    b: {
      x: number;
      y: number;
    },
    t: number,
  ) =>
    `${(a.x + (b.x - a.x) * t).toFixed(2)},${(a.y + (b.y - a.y) * t).toFixed(2)}`;

  let d = `M${lerp(c[0], c[1], round)}`;

  for (let i = 0; i < 6; i++) {
    const v = c[(i + 1) % 6];
    d += ` L${lerp(v, c[i], round)} Q${v.x.toFixed(2)},${v.y.toFixed(2)} ${lerp(v, c[(i + 2) % 6], round)}`;
  }

  return `${d} Z`;
}

const px = (c: HexCoord) => {
  const p = hexToPixel(c);

  return {
    x: p.px * R,
    y: p.py * R,
  };
};

function Icon({
  icon,
  at,
  size,
  color,
  strokeWidth = 2.25,
}: {
  icon: IconNode;
  at: {
    x: number;
    y: number;
  };
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      x={at.x - size / 2}
      y={at.y - size / 2}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icon.map(([tag, { key, ...attributes }]) =>
        createElement(tag, {
          key,
          ...attributes,
        }),
      )}
    </svg>
  );
}

function Arrow({
  from,
  to,
  color,
  dashed,
  marker,
  curve,
  both,
  startGap = R * 0.55,
  endGap = R * 0.55,
}: {
  from: HexCoord;
  to: HexCoord;
  color: string;
  dashed?: boolean;
  marker: string;
  curve?: boolean;
  both?: boolean;
  startGap?: number;
  endGap?: number;
}) {
  const a = px(from);
  const b = px(to);

  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const length = Math.hypot(dx, dy) || 1;

  // Keep at least this much line for the arrowhead.
  const minimum = R * 0.5;

  const scale = Math.min(
    1,
    Math.max(0, length - minimum) / (startGap + endGap),
  );

  const start = {
    x: a.x + (dx / length) * startGap * scale,
    y: a.y + (dy / length) * startGap * scale,
  };

  const end = {
    x: b.x - (dx / length) * endGap * scale,
    y: b.y - (dy / length) * endGap * scale,
  };

  const d = curve
    ? `M${start.x},${start.y} Q${(start.x + end.x) / 2 - dy * 0.25},${(start.y + end.y) / 2 + dx * 0.25} ${end.x},${end.y}`
    : `M${start.x},${start.y} L${end.x},${end.y}`;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="white"
        strokeWidth={8}
        strokeLinecap="round"
        strokeOpacity={0.85}
        strokeDasharray={dashed ? "6 7" : undefined}
      />

      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 7" : undefined}
        markerEnd={`url(#${marker})`}
        markerStart={both ? `url(#${marker})` : undefined}
      />
    </g>
  );
}

function RankPips({
  count,
  at,
  r,
}: {
  count: number;
  at: {
    x: number;
    y: number;
  };
  r: number;
}) {
  const w = r * 0.32;
  const h = r * 0.78;

  const gap = r * 0.12;
  const total = count * w + (count - 1) * gap;

  return (
    <g>
      {Array.from(
        {
          length: count,
        },
        (_, i) => {
          const x = at.x - total / 2 + i * (w + gap);
          const y = at.y - h / 2;

          const skew = w * 0.45;

          return (
            <path
              key={i}
              d={`M${x + skew},${y} L${x + w + skew},${y} L${x + w - skew},${y + h} L${x - skew},${y + h} Z`}
              fill="white"
            />
          );
        },
      )}
    </g>
  );
}

function ArmorDisc({
  at,
  r,
  armorTypes,
}: {
  at: {
    x: number;
    y: number;
  };
  r: number;
  armorTypes: string[];
}) {
  if (armorTypes.length <= 1) {
    return (
      <circle
        cx={at.x}
        cy={at.y}
        r={r}
        fill={defenseTypeStyle(armorTypes[0] ?? null).fill}
        stroke="white"
        strokeWidth={3}
      />
    );
  }

  const point = (i: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / armorTypes.length;
    return `${(at.x + r * Math.cos(a)).toFixed(2)},${(at.y + r * Math.sin(a)).toFixed(2)}`;
  };

  return (
    <g>
      {armorTypes.map((type, i) => (
        <path
          key={type}
          d={`M${at.x},${at.y} L${point(i)} A${r},${r} 0 0 1 ${point(i + 1)} Z`}
          fill={defenseTypeStyle(type).fill}
        />
      ))}

      <circle
        cx={at.x}
        cy={at.y}
        r={r}
        fill="none"
        stroke="white"
        strokeWidth={3}
      />
    </g>
  );
}

function DeployMark({
  at,
  r,
  color,
}: {
  at: {
    x: number;
    y: number;
  };
  r: number;
  color: string;
}) {
  return (
    <>
      <path
        d={hexPath(at.x, at.y, r)}
        fill={color}
        fillOpacity={0.45}
        stroke={color}
        strokeWidth={6}
      />

      <path
        d={hexPath(at.x, at.y, r - 6)}
        fill="none"
        stroke="white"
        strokeWidth={2}
        strokeOpacity={0.9}
      />
    </>
  );
}

type BeaconEffect = "reveal" | "remove";

type BeaconBadge = {
  effect: BeaconEffect;
  number?: number;
};

function offset(key: string, dx: number, dy: number) {
  const [x, y] = key.split(",").map(Number);

  const p = px({
    x,
    y,
  });

  return {
    x: p.x + dx * R,
    y: p.y + dy * R,
  };
}

function BeaconMark({
  badge,
  at,
}: {
  badge: BeaconBadge;
  at: {
    x: number;
    y: number;
  };
}) {
  const color = badge.effect === "remove" ? BOARD.removeIcon : BOARD.revealIcon;

  return (
    <g>
      <circle
        cx={at.x}
        cy={at.y}
        r={R * 0.24}
        fill={color}
        stroke="white"
        strokeWidth={2.5}
      />

      {badge.number !== undefined ? (
        <text
          x={at.x}
          y={at.y + R * 0.1}
          textAnchor="middle"
          fontSize={R * 0.3}
          fontWeight={800}
          fill="white"
        >
          {badge.number}
        </text>
      ) : (
        <Icon
          icon={badge.effect === "remove" ? BanIcon : FootprintsIcon}
          at={at}
          size={R * 0.28}
          color="white"
          strokeWidth={2.5}
        />
      )}
    </g>
  );
}

export type BoardImages = {
  boss: string;
  enemy: string;
  gem: string;
};

const defaultImages = (): BoardImages => ({
  boss: bossIcon.src,
  enemy: enemyIcon.src,
  gem: buildGameItemIconUrl("Currency_Icon_Gem"),
});

export type BoardMarks = {
  player: MissionAction[];
  enemy: EnemyAction[];
};

export type BoardTransition = {
  marks: BoardMarks;
  previous: MissionSnapshot;
  duration: number;
  id: number;
};

const ease = "cubic-bezier(0.4, 0, 0.2, 1)";

const moves = (e: EnemyAction) =>
  e.battle !== undefined || e.from.x !== e.to.x || e.from.y !== e.to.y;

function sequence(marks: BoardMarks | undefined) {
  const enemies = new Map<number, number>();
  const echelons = new Map<number, number>();

  for (const e of marks?.enemy ?? []) {
    if (!moves(e)) {
      continue;
    }

    const slot = enemies.get(e.entityId) ?? enemies.size;
    enemies.set(e.entityId, slot);

    if (e.battle !== undefined) {
      echelons.set(e.battle, slot);
    }
  }

  const evacuates = (marks?.player ?? []).some((a) => a.type === "evacuate");

  return {
    enemies,
    echelons,
    evacuationSlot: enemies.size,
    steps: Math.max(1, enemies.size + (evacuates && enemies.size > 0 ? 1 : 0)),
  };
}

export const transitionLength = (transition: BoardTransition) =>
  transition.duration * sequence(transition.marks).steps;

function placed(
  c: HexCoord,
  duration: number,
  opacity = 1,
  fadeDelay = 0,
  delay = 0,
  still = false,
): {
  transform?: string;
  style: CSSProperties;
} {
  const p = px(c);

  if (still) {
    return {
      transform: `translate(${p.x} ${p.y})`,
      style: {
        opacity,
      },
    };
  }

  return {
    style: {
      transform: `translate(${p.x}px, ${p.y}px)`,
      opacity,
      transition:
        duration > 0
          ? `transform ${duration}ms ${ease} ${delay}ms, opacity ${duration * 0.6}ms ${ease} ${delay + fadeDelay}ms`
          : "none",
    },
  };
}

const fade = (duration: number, delay = 0): CSSProperties => ({
  transition:
    duration > 0 ? `opacity ${duration * 0.8}ms ${ease} ${delay}ms` : "none",
});

function EchelonToken({
  echelon,
  at,
  gone = false,
  teleportId,
  duration,
  delay = 0,
  icon,
  clipId,
  color,
  fadeInName,
  still,
  plate,
}: {
  echelon: number;
  icon?: string | null;
  clipId: string;
  color: string;
  at: HexCoord;
  gone?: boolean;
  teleportId: number | null;
  duration: number;
  delay?: number;
  fadeInName: string;
  still?: boolean;
  plate?: boolean;
}) {
  const placement = placed(
    at,
    teleportId === null ? duration : 0,
    gone ? 0 : 1,
    0,
    delay,
    still,
  );

  const fadeIn =
    teleportId !== null && duration > 0
      ? `${fadeInName} ${duration * 0.45}ms ${ease} ${delay + duration * 0.4}ms backwards`
      : undefined;

  return (
    <g {...placement}>
      <g
        key={teleportId ?? "still"}
        style={{
          animation: fadeIn,
        }}
      >
        <EchelonShape
          echelon={echelon}
          icon={icon}
          clipId={clipId}
          color={color}
          plate={plate}
        />
      </g>
    </g>
  );
}

function EchelonShape({
  echelon,
  icon,
  clipId,
  color,
  plate = true,
}: {
  echelon: number;
  icon?: string | null;
  clipId: string;
  color: string;
  plate?: boolean;
}) {
  const badge = hexPath(0, 0, R * 0.52);
  return (
    <>
      {plate && (
        <path
          d={hexPath(0, 0, R * 0.8)}
          fill={BOARD.teamPlate}
          stroke={BOARD.team}
          strokeWidth={5}
        />
      )}

      <path d={hexPath(0, 2, R * 0.52)} fill="black" fillOpacity={0.2} />

      {icon ? (
        <>
          <clipPath id={clipId}>
            <path d={badge} />
          </clipPath>

          <path d={badge} fill="white" />

          <image
            href={icon}
            x={-R * 0.56}
            y={-R * 0.56}
            width={R * 1.12}
            height={R * 1.12}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />

          <path d={badge} fill="none" stroke={color} strokeWidth={4} />

          <circle
            cx={R * 0.46}
            cy={R * 0.4}
            r={R * 0.22}
            fill={color}
            stroke="white"
            strokeWidth={2}
          />

          <text
            x={R * 0.46}
            y={R * 0.4 + R * 0.1}
            textAnchor="middle"
            fontSize={R * 0.28}
            fontWeight={800}
            fill="white"
          >
            {echelonName(echelon)}
          </text>
        </>
      ) : (
        <>
          <path d={badge} fill={color} stroke="white" strokeWidth={3} />

          <text
            x={0}
            y={R * 0.19}
            textAnchor="middle"
            fontSize={R * 0.52}
            fontWeight={800}
            fill="white"
          >
            {echelonName(echelon)}
          </text>
        </>
      )}
    </>
  );
}

function EnemyShape({
  unit,
  labels,
  images,
}: {
  unit: MissionMapUnit;
  images: BoardImages;
  labels: {
    boss: string;
    enemy: string;
    armor: Record<string, string>;
  };
}) {
  const boss = unit.grade === "Boss";

  const r = R * (boss ? BOSS_RADIUS : ENEMY_RADIUS);

  const at = {
    x: 0,
    y: 0,
  };

  const badge =
    unit.ai === "Pursuit"
      ? FootprintsIcon
      : unit.ai === "Guard"
        ? ShieldIcon
        : null;

  return (
    <>
      <title>
        {`${boss ? labels.boss : labels.enemy}: ${unit.armorTypes
          .map((type) => labels.armor[type] ?? type)
          .join(", ")}`}
      </title>

      <circle cx={0} cy={2} r={r} fill="black" fillOpacity={0.2} />

      <ArmorDisc at={at} r={r} armorTypes={unit.armorTypes} />

      {boss ? (
        <image
          href={images.boss}
          x={-R * 0.52}
          y={-R * 0.48}
          width={R * 1.04}
          height={R * 1.04 * (105 / 124)}
        />
      ) : (
        <>
          <image
            href={images.enemy}
            x={-R * 0.33}
            y={-R * 0.35}
            width={R * 0.66}
            height={R * 0.66}
          />

          <rect
            x={-R * 0.3}
            y={r * 0.78}
            width={R * 0.6}
            height={R * 0.3}
            rx={R * 0.08}
            fill={defenseTypeStyle(mainArmor(unit)).fill}
            stroke="white"
            strokeWidth={1.5}
          />

          <RankPips
            count={GRADE_PIPS[unit.grade]}
            at={{
              x: 0,
              y: r * 0.78 + R * 0.15,
            }}
            r={R * 0.28}
          />
        </>
      )}

      {badge && (
        <>
          <circle
            cx={r * 0.8}
            cy={-r * 0.8}
            r={R * 0.24}
            fill="white"
            stroke={defenseTypeStyle(mainArmor(unit)).fill}
            strokeWidth={2}
          />

          <Icon
            icon={badge}
            at={{
              x: r * 0.8,
              y: -r * 0.8,
            }}
            size={R * 0.3}
            color="#334155"
          />
        </>
      )}
    </>
  );
}

type MissionBoardProps = {
  map: MissionMapData;
  snapshot: MissionSnapshot | null;
  marks?: BoardMarks;
  transition?: BoardTransition | null;
  teamIcons?: (string | null)[];
  teamColors?: string[];
  labels: {
    title: string;
    boss: string;
    enemy: string;
    armor: Record<string, string>;
  };
  images?: BoardImages;
  still?: boolean;
  deployment?: boolean;
};

export function MissionBoard(props: MissionBoardProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return <MissionBoardSvg {...props} id={id} />;
}

export function MissionBoardSvg({
  id,
  map,
  snapshot,
  marks,
  transition,
  teamIcons,
  teamColors,
  labels,
  images = defaultImages(),
  still = false,
  deployment = false,
}: MissionBoardProps & {
  id: string;
}) {
  const duration = transition?.duration ?? 0;

  const teamColor = (echelon: number) =>
    teamColors?.[echelon] ?? attackTypeStyle(null).fill;

  const arrowColors = [
    ...new Set([
      ...(teamColors ?? []),
      attackTypeStyle(null).fill,
      BOARD.enemyArrow,
    ]),
  ];

  const markerFor = (color: string) =>
    `${id}-arrow-${arrowColors.indexOf(color)}`;

  const tiles = new Map<string, HexCoord>();

  for (const t of map.tiles) {
    tiles.set(hexKey(t), t);
  }

  const hidden = new Set((snapshot?.hidden ?? []).map(hexKey));

  const objectIds = snapshot ? new Set(snapshot.objects) : null;
  const objects = map.objects.filter(
    (o) => !objectIds || objectIds.has(o.entityId),
  );

  const switches = snapshot?.switches ?? {};

  const closed = new Set<string>();

  for (const o of objects) {
    const on = switches[o.switchId ?? -1] ?? true;

    if (
      (o.type === "SwitchMovableWhenToggleOn" && !on) ||
      (o.type === "SwitchMovableWhenToggleOff" && on)
    ) {
      closed.add(hexKey(o));
    }
  }

  const effects = new Map<
    string,
    {
      effect: BeaconEffect;
      targets: string[];
    }
  >();

  for (const event of map.events) {
    const arrive = event.conditions.find((c) => c.type === "arrive");

    if (!arrive || event.conditions.length !== 1) {
      continue;
    }

    const key = hexKey(arrive as HexCoord);

    for (const c of event.commands) {
      if (c.type !== "showTiles" && c.type !== "hideTiles") {
        continue;
      }

      const entry = effects.get(key) ?? {
        effect: c.type === "hideTiles" ? "remove" : "reveal",
        targets: [],
      };

      entry.targets.push(...c.tiles.map(hexKey).filter((t) => t !== key));
      effects.set(key, entry);
    }
  }

  const beacons = map.objects
    .filter((o) => isBeacon(o) && effects.has(hexKey(o)))
    .sort((a, b) => px(a).y - px(b).y || px(a).x - px(b).x);

  const beaconTiles = new Map<string, BeaconBadge>();

  const targetBadges: {
    key: string;
    target: string;
    badge: BeaconBadge;
    index: number;
    shown: boolean;
  }[] = [];

  beacons.forEach((o, i) => {
    const key = hexKey(o);

    const { effect, targets } = effects.get(key) as {
      effect: BeaconEffect;
      targets: string[];
    };

    const badge = {
      effect,
      number: beacons.length > 1 ? i + 1 : undefined,
    };

    beaconTiles.set(key, badge);

    targets.forEach((target) => {
      const index = targetBadges.filter((b) => b.target === target).length;

      targetBadges.push({
        key: `${key}>${target}`,
        target,
        badge,
        index,
        shown:
          (!objectIds || objectIds.has(o.entityId)) &&
          hidden.has(target) === (effect === "reveal"),
      });
    });
  });

  const hiddenAtStart = new Set<string>();

  for (const event of map.events) {
    if (event.conditions.some((c) => c.type === "start")) {
      for (const c of event.commands) {
        if (c.type === "hideTiles") {
          for (const t of c.tiles) {
            hiddenAtStart.add(hexKey(t));
          }
        }
      }
    }
  }

  const startTiles = new Set(
    map.objects.filter((o) => isStartObject(o.type)).map(hexKey),
  );

  const teamTiles = new Set(
    (snapshot?.echelons ?? []).flatMap((e) =>
      e
        ? [
            hexKey(e),
          ]
        : [],
    ),
  );

  const deployedAt = new Map<string, number>();

  if (deployment) {
    snapshot?.echelons.forEach((e, echelon) => {
      if (e && startTiles.has(hexKey(e))) {
        deployedAt.set(hexKey(e), echelon);
      }
    });
  }

  const ordered = [
    ...tiles.entries(),
  ].sort(([, a], [, b]) => px(a).y - px(b).y || px(a).x - px(b).x);

  const points = ordered.map(([, t]) => px(t));

  const minX = Math.min(...points.map((p) => p.x)) - R * 1.05;
  const maxX = Math.max(...points.map((p) => p.x)) + R * 1.05;
  const minY = Math.min(...points.map((p) => p.y)) - R * 1.05;
  const maxY = Math.max(...points.map((p) => p.y)) + R * 1.2;

  const battles = new Map<string, "fight" | "withdraw">();
  for (const a of marks?.player ?? []) {
    if (
      (a.type === "move" || a.type === "teleport") &&
      a.battle !== undefined
    ) {
      battles.set(hexKey(a.to), "fight");
    }

    if (a.type === "withdraw") {
      battles.set(hexKey(a.to), "withdraw");
    }
  }

  for (const e of marks?.enemy ?? []) {
    if (e.battle !== undefined) {
      battles.set(hexKey(e.to), e.withdrawn ? "withdraw" : "fight");
    }
  }

  const present = new Map(
    (snapshot?.enemies ?? []).map((e) => [
      e.entityId,
      e,
    ]),
  );

  const before = new Map(
    (transition?.previous.enemies ?? []).map((e) => [
      e.entityId,
      e,
    ]),
  );

  const foughtAt = new Map<number, HexCoord>();

  for (const e of transition?.marks.enemy ?? []) {
    if (e.battle !== undefined) {
      foughtAt.set(e.entityId, e.to);
    }
  }

  for (const a of transition?.marks.player ?? []) {
    if (
      (a.type === "move" || a.type === "teleport") &&
      a.battle !== undefined
    ) {
      foughtAt.set(a.battle, a.to);
    }
  }

  const teleports = new Map<number, HexCoord>();

  for (const a of transition?.marks.player ?? []) {
    if (a.type === "teleport" || a.type === "evacuate") {
      teleports.set(a.echelon, a.from);
    }
  }

  const order = sequence(transition?.marks);

  const enemyDelay = (entityId: number) =>
    (order.enemies.get(entityId) ?? 0) * duration;

  const echelonDelay = (echelon: number) => {
    const slot = order.echelons.get(echelon);

    if (slot !== undefined) {
      return (slot + 0.6) * duration;
    }

    return teleports.has(echelon) && order.enemies.size > 0
      ? order.evacuationSlot * duration
      : 0;
  };

  const teamAt = teamTiles;
  const enemyRadius = new Map<string, number>();

  for (const e of snapshot?.enemies ?? []) {
    const unit = map.units.find((u) => u.entityId === e.entityId);

    enemyRadius.set(
      hexKey(e),
      R * (unit?.grade === "Boss" ? BOSS_RADIUS : ENEMY_RADIUS),
    );
  }

  const gapAt = (c: HexCoord) =>
    teamAt.has(hexKey(c))
      ? R * 0.84
      : (enemyRadius.get(hexKey(c)) ?? R * 0.15) + R * 0.06;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      {...(still
        ? {
            width: maxX - minX,
            height: maxY - minY,
            fontFamily: "Noto Sans",
          }
        : {
            className:
              "mx-auto block h-auto max-h-[max(18rem,calc(100vh-29rem))] w-full",
            style: {
              maxWidth: `${(maxX - minX) * MAX_SCALE}px`,
            },
          })}
      role="img"
      aria-label={labels.title}
    >
      <defs>
        <pattern
          id={`${id}-closed`}
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="9" height="9" fill="#9fb4dd" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="#6f84c0" strokeWidth="4" />
        </pattern>

        {arrowColors.map((color, i) => (
          <marker
            key={color}
            id={`${id}-arrow-${i}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="3.5"
            markerHeight="3.5"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={color} />
          </marker>
        ))}
      </defs>

      {ordered.map(([key, t]) => {
        const p = px(t);

        const isHidden = hidden.has(key);

        const removed = isHidden && !hiddenAtStart.has(key);
        const pending = isHidden && !removed;

        const beacon = beaconTiles.get(key)?.effect;

        const start = startTiles.has(key);

        const kind =
          start &&
          !teamTiles.has(key) &&
          objects.some((o) => isStartObject(o.type) && hexKey(o) === key)
            ? "start"
            : beacon === "remove"
              ? "remove"
              : "tile";

        const colors = {
          start: {
            slab: BOARD.startSlab,
            top: BOARD.start,
            rim: BOARD.startRim,
            detail: BOARD.startDetail,
          },
          remove: {
            slab: BOARD.removeSlab,
            top: BOARD.remove,
            rim: BOARD.removeRim,
            detail: BOARD.removeRim,
          },
          tile: {
            slab: BOARD.tileSlab,
            top: BOARD.tile,
            rim: BOARD.tileRim,
            detail: BOARD.tileDetail,
          },
        }[kind];
        const r = R * 0.94;

        const side = R * 0.72;
        const corners = `${side * 0.22} ${side * 0.56} ${side * 0.22} 0`;

        return (
          <g key={key}>
            {/* Not there yet */}
            <g
              style={{
                opacity: pending ? 1 : 0,
                ...fade(duration),
              }}
            >
              <path d={hexPath(p.x, p.y + SLAB, r)} fill={BOARD.hiddenSlab} />

              <path
                d={hexPath(p.x, p.y, r)}
                fill={BOARD.hidden}
                stroke={BOARD.hiddenDetail}
                strokeWidth={3}
              />

              <path
                d={hexPath(p.x, p.y, side, 0)}
                fill="none"
                stroke={BOARD.hiddenDetail}
                strokeWidth={2}
                strokeDasharray={corners}
                opacity={0.6}
              />
            </g>

            {/* Removed: only an outline is left */}
            <path
              d={hexPath(p.x, p.y, r)}
              fill="none"
              stroke={BOARD.removeRim}
              strokeOpacity={0.7}
              strokeWidth={2}
              strokeDasharray="6 6"
              style={{
                opacity: removed ? 1 : 0,
                ...fade(duration),
              }}
            />

            {/* The tile */}
            <g
              style={{
                opacity: isHidden ? 0 : 1,
                ...fade(duration, duration * 0.3),
              }}
            >
              <path d={hexPath(p.x, p.y + SLAB, r)} fill={colors.slab} />

              <path
                d={hexPath(p.x, p.y, r)}
                fill={closed.has(key) ? `url(#${id}-closed)` : colors.top}
                stroke={colors.rim}
                strokeWidth={kind === "start" ? 4 : 3}
              />

              <path
                d={hexPath(p.x, p.y, side, 0)}
                fill="none"
                stroke={colors.detail}
                strokeWidth={kind === "start" ? 3 : 2}
                strokeDasharray={corners}
                opacity={0.9}
              />

              {deployedAt.has(key) && (
                <DeployMark
                  at={p}
                  r={r}
                  color={teamColor(deployedAt.get(key) as number)}
                />
              )}

              {beacon && (
                <>
                  <Icon
                    icon={FootprintsIcon}
                    at={p}
                    size={R * 0.82}
                    color={beacon === "remove" ? BOARD.removeIcon : "#5bc0eb"}
                    strokeWidth={2}
                  />

                  {beacon === "remove" && (
                    <Icon
                      icon={BanIcon}
                      at={p}
                      size={R * 1.15}
                      color={BOARD.removeIcon}
                      strokeWidth={1.75}
                    />
                  )}
                </>
              )}
            </g>
          </g>
        );
      })}

      {map.objects.map((o) => {
        const p = px(o);

        const shown =
          (!objectIds || objectIds.has(o.entityId)) && !hidden.has(hexKey(o));

        const style = {
          opacity: shown ? 1 : 0,
          ...fade(duration, duration * 0.4),
        };

        if (isBoxObject(o.type)) {
          return (
            <image
              key={o.entityId}
              href={images.gem}
              x={p.x - GEM.width / 2}
              y={p.y + R * 0.03 - GEM.height * 0.49}
              width={GEM.width}
              height={GEM.height}
              style={style}
            />
          );
        }

        if (o.type === "SwitchToggle") {
          const on = switches[o.switchId ?? -1] ?? true;

          return (
            <g key={o.entityId} style={style}>
              <Icon
                icon={on ? ToggleRightIcon : ToggleLeftIcon}
                at={p}
                size={R * 0.9}
                color={BOARD.icon}
              />
            </g>
          );
        }

        const icon = OBJECT_ICONS[o.type];

        return icon ? (
          <g key={o.entityId} style={style}>
            <Icon icon={icon} at={p} size={R * 0.78} color={BOARD.icon} />
          </g>
        ) : null;
      })}

      {[
        ...beaconTiles,
      ].map(([key, badge]) =>
        badge.number === undefined ? null : (
          <g
            key={`bm${key}`}
            style={{
              opacity: hidden.has(key) ? 0 : 1,
              ...fade(duration),
            }}
          >
            <BeaconMark badge={badge} at={offset(key, 0.52, 0.5)} />
          </g>
        ),
      )}

      {targetBadges.map(({ key, target, badge, index, shown }) => (
        <g
          key={`bt${key}`}
          style={{
            opacity: shown ? 1 : 0,
            ...fade(duration, duration * 0.3),
          }}
        >
          <BeaconMark
            badge={badge}
            at={offset(target, 0.52 - index * 0.5, -0.52)}
          />
        </g>
      ))}

      {map.units.map((unit) => {
        const now = present.get(unit.entityId);

        const at =
          now ??
          foughtAt.get(unit.entityId) ??
          before.get(unit.entityId) ??
          unit;

        return (
          <g
            key={unit.entityId}
            {...placed(
              at,
              duration,
              now ? 1 : 0,
              now ? 0 : duration * 0.6,
              enemyDelay(unit.entityId),
              still,
            )}
          >
            <EnemyShape unit={unit} labels={labels} images={images} />
          </g>
        );
      })}

      {[
        ...teleports,
      ].map(([echelon, from]) =>
        duration > 0 ? (
          <g
            key={`ghost${transition?.id}-${echelon}`}
            style={{
              ...placed(from, 0).style,
              animation: `${id}-fade-out ${duration * 0.4}ms ${ease} ${echelonDelay(echelon)}ms forwards`,
            }}
          >
            <EchelonShape
              echelon={echelon}
              icon={teamIcons?.[echelon]}
              clipId={`${id}-ghost-${echelon}`}
              color={teamColor(echelon)}
            />
          </g>
        ) : null,
      )}

      {!still && (
        <style>{`@keyframes ${id}-fade-out { from { opacity: 1 } to { opacity: 0 } } @keyframes ${id}-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
      )}

      {snapshot?.echelons.map((e, i) => {
        const at = e ?? transition?.previous.echelons[i];

        return at ? (
          <EchelonToken
            key={`t${i}`}
            echelon={i}
            at={at}
            gone={!e}
            teleportId={teleports.has(i) ? (transition?.id ?? 0) : null}
            duration={duration}
            delay={echelonDelay(i)}
            icon={teamIcons?.[i]}
            clipId={`${id}-team-${i}`}
            color={teamColor(i)}
            fadeInName={`${id}-fade-in`}
            still={still}
            plate={!(e && deployedAt.has(hexKey(e)))}
          />
        ) : null;
      })}

      {marks?.enemy.map((e, i) =>
        e.from.x === e.to.x && e.from.y === e.to.y ? null : (
          <Arrow
            key={`e${i}`}
            from={e.from}
            to={e.to}
            startGap={gapAt(e.from)}
            endGap={gapAt(e.to)}
            color={BOARD.enemyArrow}
            dashed
            marker={markerFor(BOARD.enemyArrow)}
          />
        ),
      )}

      {marks?.player.map((a, i) => {
        if (a.type === "swap") {
          return (
            <Arrow
              key={`p${i}`}
              from={a.from}
              to={a.to}
              startGap={gapAt(a.from)}
              endGap={gapAt(a.to)}
              color={teamColor(a.echelon)}
              marker={markerFor(teamColor(a.echelon))}
              both
            />
          );
        }
        return (
          <Arrow
            key={`p${i}`}
            from={a.from}
            to={a.to}
            startGap={gapAt(a.from)}
            endGap={gapAt(a.to)}
            color={teamColor(a.echelon)}
            dashed={a.type === "teleport" || a.type === "evacuate"}
            curve={a.type === "teleport" || a.type === "evacuate"}
            marker={markerFor(teamColor(a.echelon))}
          />
        );
      })}

      {[
        ...battles,
      ].map(([key, kind]) => {
        const at = offset(key, -0.55, 0.45);
        return (
          <g key={`b${key}`}>
            <circle cx={at.x} cy={at.y} r={R * 0.28} fill="white" />

            <Icon
              icon={kind === "withdraw" ? FlagIcon : SwordsIcon}
              at={at}
              size={R * 0.38}
              color={kind === "withdraw" ? "#475569" : BOARD.enemyArrow}
            />
          </g>
        );
      })}
    </svg>
  );
}
