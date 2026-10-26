"use client";

import type { RoadmapLabels } from "@/components/roadmap/use-roadmap-labels";
import { DAY_MS } from "@/lib/roadmap/constants";
import { isDotItem, isInstantItem } from "@/lib/roadmap/layout";
import { getRaidImage } from "@/lib/roadmap/raid-images";
import type {
  RoadmapBannerItem,
  RoadmapItem,
  RoadmapRaidItem,
  RoadmapRaidRoom,
} from "@/lib/roadmap/types";
import { TERRAIN_ICONS } from "@/lib/terrain";
import { buildStudentIconUrlFromId } from "@/lib/url";
import { cn } from "@/lib/utils";
import { EllipsisIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { AttackType, DefenseType, Terrain } from "~prisma";

const ATTACK_COLORS: Partial<Record<AttackType, string>> = {
  Explosion: "bg-type-red",
  Pierce: "bg-type-yellow",
  Mystic: "bg-type-blue",
  Sonic: "bg-type-purple",
  Chemical: "bg-type-green",
};

const DEFENSE_COLORS: Partial<Record<DefenseType, string>> = {
  LightArmor: "bg-type-red",
  HeavyArmor: "bg-type-yellow",
  Unarmed: "bg-type-blue",
  ElasticArmor: "bg-type-purple",
  CompositeArmor: "bg-type-green",
};

function Chip({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm px-1 text-[10px] leading-4 font-semibold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

function AttackChip({
  type,
  labels,
}: {
  type: AttackType;
  labels: RoadmapLabels;
}) {
  return (
    <Chip className={cn("text-white", ATTACK_COLORS[type] ?? "bg-slate-500")}>
      {labels.t("static.roadmap.attackTypeChip", {
        type: labels.t(`common.attackType.${type}`),
      })}
    </Chip>
  );
}

function DefenseChip({
  type,
  labels,
  suffix,
}: {
  type: DefenseType;
  labels: RoadmapLabels;
  suffix?: string;
}) {
  return (
    <Chip
      className={cn("text-white", DEFENSE_COLORS[type] ?? "bg-slate-500")}
      title={`${labels.t("static.roadmap.defense")}: ${labels.t(`common.defenseType.${type}`)}`}
    >
      {labels.t(`common.defenseType.${type}`)}
      {suffix && <span className="opacity-80">{suffix}</span>}
    </Chip>
  );
}

function TerrainMarker({
  terrain,
  labels,
  compact,
}: {
  terrain: Terrain;
  labels: RoadmapLabels;
  compact?: boolean;
}) {
  const name = labels.t(`common.terrain.${terrain}`);

  return (
    <span
      title={`${labels.t("static.roadmap.terrain")}: ${name}`}
      className="inline-flex shrink-0 items-center gap-1 text-[10px] leading-4 font-semibold whitespace-nowrap"
    >
      <img
        src={TERRAIN_ICONS[terrain].src}
        alt={compact ? name : ""}
        width={16}
        height={16}
        draggable={false}
        className="size-4 rounded-[3px]"
      />
      {!compact && name}
    </span>
  );
}

function roomSuffix(room: RoadmapRaidRoom) {
  if (room.hasLunatic) {
    return " L";
  }
  if (room.hasTorment) {
    return " T";
  }
  return undefined;
}

export function RaidChips({
  item,
  labels,
  compact,
  className,
}: {
  item: RoadmapRaidItem;
  labels: RoadmapLabels;
  compact?: boolean;
  className?: string;
}) {
  const hasRooms = item.type === "EliminateRaid" && item.rooms.length > 0;

  return (
    <div className={cn("flex items-center gap-0.5 flex-wrap", className)}>
      {hasRooms
        ? item.rooms.flatMap((room, idx) =>
            room.defenseTypes.map((type) => (
              <DefenseChip
                key={`room-${idx}-${type}`}
                type={type}
                labels={labels}
                suffix={roomSuffix(room)}
              />
            )),
          )
        : item.defenseTypes.map((type) => (
            <DefenseChip key={`def-${type}`} type={type} labels={labels} />
          ))}

      {item.terrains.map((terrain) => (
        <TerrainMarker
          key={terrain}
          terrain={terrain}
          labels={labels}
          compact={compact}
        />
      ))}
    </div>
  );
}

const MORE_CHIP_WIDTH = 28;

function BannerStudent({
  student,
  size,
  showName,
}: {
  student: RoadmapBannerItem["students"][number];
  size: number;
  showName: boolean;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <img
        src={buildStudentIconUrlFromId(student.id)}
        alt={student.name}
        title={student.name}
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        className={cn("rounded-full border bg-background object-cover", {
          "border-primary": student.isFestGlobal,
          "border-amber-500": !student.isFestGlobal && student.isLimitedGlobal,
        })}
        style={{ width: size, height: size }}
      />
      {showName && (
        <span className="text-xs font-medium whitespace-nowrap">
          {student.name}
        </span>
      )}
    </div>
  );
}

export function BannerStudents({
  students,
  size = 24,
  showNames = true,
  fit,
  className,
}: {
  students: RoadmapBannerItem["students"];
  size?: number;
  showNames?: boolean;
  fit?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(students.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!fit || !container || !measure) {
      return;
    }

    const update = () => {
      const available = container.clientWidth;
      const rights = Array.from(measure.children).map(
        (child) =>
          (child as HTMLElement).offsetLeft +
          (child as HTMLElement).offsetWidth,
      );
      const fitting = (width: number) =>
        rights.filter((right) => right <= width).length;

      let count = fitting(available);
      if (count < rights.length) {
        count = fitting(available - MORE_CHIP_WIDTH);
      }
      setVisibleCount(count);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [fit, students, size, showNames]);

  if (!fit) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-1.5 gap-y-1",
          className,
        )}
      >
        {students.map((student) => (
          <BannerStudent
            key={student.id}
            student={student}
            size={size}
            showName={showNames}
          />
        ))}
      </div>
    );
  }

  const hidden = students.slice(visibleCount);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex w-full min-w-0 items-center gap-1.5 overflow-hidden",
        className,
      )}
    >
      {/* invisible copy used to measure how many students fit */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 flex w-max items-center gap-1.5"
      >
        {students.map((student) => (
          <BannerStudent
            key={student.id}
            student={student}
            size={size}
            showName={showNames}
          />
        ))}
      </div>

      {students.slice(0, visibleCount).map((student) => (
        <BannerStudent
          key={student.id}
          student={student}
          size={size}
          showName={showNames}
        />
      ))}

      {hidden.length > 0 && (
        <span
          title={hidden.map((student) => student.name).join(", ")}
          className="flex shrink-0 items-center justify-center rounded-full border bg-background/70"
          style={{ width: size, height: size }}
        >
          <EllipsisIcon className="size-3.5" />
        </span>
      )}
    </div>
  );
}

function durationDays(item: RoadmapItem): number | null {
  if (isDotItem(item)) {
    return null;
  }

  return Math.max(
    1,
    Math.round(
      (new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) /
        DAY_MS,
    ),
  );
}

export function RoadmapItemDetails({
  item,
  labels,
  withTitle = true,
}: {
  item: RoadmapItem;
  labels: RoadmapLabels;
  withTitle?: boolean;
}) {
  const subtitle = labels.subtitle(item);
  const duration = durationDays(item);

  const raidArt =
    item.kind === "raid" || item.kind === "frr" ? getRaidImage(item) : null;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      {raidArt?.shape === "wide" && (
        <img
          src={raidArt.image.src}
          alt=""
          aria-hidden
          loading="lazy"
          className="h-14 w-auto max-w-full object-contain object-left"
        />
      )}

      {withTitle && (
        <div className="flex items-center justify-between gap-3">
          <div>
            {subtitle && (
              <div className="text-[10px] font-semibold uppercase opacity-70">
                {subtitle}
              </div>
            )}
            <div className="font-bold">{labels.title(item)}</div>
          </div>

          {raidArt?.shape === "square" && (
            <img
              src={raidArt.image.src}
              alt=""
              aria-hidden
              loading="lazy"
              className="size-12 shrink-0 object-contain"
            />
          )}
        </div>
      )}

      <div className="text-xs tabular-nums">
        {labels.dateRange(item)}
        {item.kind !== "birthday" && ` ${labels.zoneName}`}
        {duration !== null && (
          <span className="opacity-70">
            {" "}
            ({labels.t("static.roadmap.duration", { count: duration })})
          </span>
        )}
        {duration === null && !isInstantItem(item) && (
          <span className="opacity-70">
            {" "}
            ({labels.t("static.roadmap.permanent")})
          </span>
        )}
      </div>

      {(item.kind === "raid" || item.kind === "frr") && (
        <>
          <RaidChips item={{ ...item, rooms: [] }} labels={labels} />

          {item.attackTypes.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="font-semibold opacity-70">
                {labels.t("static.roadmap.insanePlus")}
              </span>

              {item.attackTypes.map((type) => (
                <AttackChip key={type} type={type} labels={labels} />
              ))}
            </div>
          )}

          {item.type === "EliminateRaid" && item.rooms.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {item.rooms.map((room, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs">
                  {room.defenseTypes.map((type) => (
                    <DefenseChip key={type} type={type} labels={labels} />
                  ))}

                  {room.attackTypes.map((type) => (
                    <AttackChip key={type} type={type} labels={labels} />
                  ))}

                  {room.hasTorment && (
                    <span className="text-[10px] font-semibold">
                      {labels.t("common.difficulties.Torment")}
                    </span>
                  )}

                  {room.hasLunatic && (
                    <span className="text-[10px] font-semibold">
                      {labels.t("common.difficulties.Lunatic")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {item.kind === "banner" && (
        <>
          <BannerStudents students={item.students} />

          {(item.freePulls > 0 || item.isSelectablePickup) && (
            <div className="text-xs opacity-80">
              {[
                item.isSelectablePickup &&
                  labels.t("static.roadmap.selectablePickup"),
                item.freePulls > 0 &&
                  labels.t("static.roadmap.freePulls", {
                    count: item.freePulls,
                  }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </>
      )}

      {item.kind === "birthday" && <BannerStudents students={item.students} />}

      {item.kind === "event" && item.eventStudent && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase opacity-70">
            {labels.t("static.roadmap.eventStudent")}
          </span>

          <div className="flex items-center gap-2">
            <img
              src={buildStudentIconUrlFromId(item.eventStudent.id)}
              alt=""
              width={32}
              height={32}
              loading="lazy"
              className="size-8 rounded-full border bg-background object-cover"
            />

            <span className="text-sm font-semibold">
              {item.eventStudent.name}
            </span>
          </div>
        </div>
      )}

      {item.kind === "story" && item.episodeCount > 0 && (
        <div className="text-xs">
          {labels.t("static.roadmap.episodes", { count: item.episodeCount })}
        </div>
      )}

      {item.kind === "etc" && item.description && (
        <div className="text-xs whitespace-pre-line max-w-80">
          {item.description}
        </div>
      )}
    </div>
  );
}
