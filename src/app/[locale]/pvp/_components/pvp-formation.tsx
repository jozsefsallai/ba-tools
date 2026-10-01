"use client";

import { PVPFormationDamageChart } from "@/app/[locale]/pvp/_components/pvp-formation-damage-chart";
import type {
  PVPMatchResult,
  PVPMatchType,
} from "@/app/[locale]/pvp/_lib/types";
import { EmptyCard } from "@/components/common/empty-card";
import { StudentCard } from "@/components/common/student-card";
import { useStudents } from "@/hooks/use-students";
import { buildStudentPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { ShieldIcon, SwordIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { Doc } from "~convex/dataModel";
import type { Student } from "~prisma";

const RANK_THRESHOLDS = {
  PLATINUM: 100,
  GOLD: 5000,
  SILVER: 10000,
};

function PVPRank({ rank }: { rank?: number }) {
  return (
    <span
      className={cn("font-bold", {
        "text-purple-400": !!rank && rank <= RANK_THRESHOLDS.PLATINUM,
        "text-yellow-400":
          !!rank &&
          rank > RANK_THRESHOLDS.PLATINUM &&
          rank <= RANK_THRESHOLDS.GOLD,
        "text-gray-400":
          !!rank &&
          rank > RANK_THRESHOLDS.GOLD &&
          rank <= RANK_THRESHOLDS.SILVER,
        "text-orange-700": !!rank && rank > RANK_THRESHOLDS.SILVER,
        "text-muted-foreground": !rank,
      })}
    >
      {rank ?? "N/A"}
    </span>
  );
}

export type PVPFormationProps = {
  formation: Doc<"pvpMatchRecord">["ownTeam"];
  name: string;
  kind: PVPMatchType;
  result: PVPMatchResult;
  rank?: number;
  studentRep?: Student | null;
  damageChartOpen: boolean;
  highestDamage: number;
  showHeader?: boolean;
};

export function PVPFormation({
  formation,
  name,
  kind,
  result,
  rank,
  studentRep,
  damageChartOpen,
  highestDamage,
  showHeader = true,
}: PVPFormationProps) {
  const t = useTranslations();

  const { studentMap } = useStudents();

  const strikers = useMemo(() => {
    return formation
      .filter((_, idx) => idx < 4)
      .map((item) => ({
        ...item,
        student: item.studentId ? (studentMap[item.studentId] ?? null) : null,
      }));
  }, [formation]);

  const specials = useMemo(() => {
    return formation
      .filter((_, idx) => idx >= 4)
      .map((item) => ({
        ...item,
        student: item.studentId ? (studentMap[item.studentId] ?? null) : null,
      }));
  }, [formation]);

  const studentPortraitUrl = useMemo(() => {
    if (!studentRep) {
      return null;
    }

    return buildStudentPortraitUrl(studentRep);
  }, [studentRep]);

  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      {showHeader && (
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2 text-center">
          {kind === "attack" && <SwordIcon />}
          {kind === "defense" && <ShieldIcon />}

          <div
            className={cn(
              "font-nexon-football-gothic font-bold italic mt-1 mr-1",
              {
                "text-green-500": result === "win",
                "text-red-500": result === "loss",
              },
            )}
          >
            {result === "win"
              ? t("tools.pvp.match.win")
              : t("tools.pvp.match.loss")}
          </div>

          {studentRep && studentPortraitUrl && (
            <img
              src={studentPortraitUrl}
              alt={studentRep.name}
              className="h-6"
            />
          )}

          <div className="font-bold">{name}</div>

          {rank !== undefined && (
            <div className="text-sm text-muted-foreground">
              (rank: <PVPRank rank={rank} />)
            </div>
          )}
        </div>
      )}

      <div
        className="flex max-w-full flex-wrap items-center justify-center gap-3"
        style={{ zoom: 0.8 }}
      >
        <div className="flex flex-wrap items-center justify-center gap-[2px]">
          {strikers.map((item, idx) =>
            item.student ? (
              <StudentCard
                key={idx}
                student={item.student}
                level={item.level}
                starLevel={item.starLevel}
                ueLevel={item.ueLevel}
              />
            ) : (
              <EmptyCard key={idx} />
            ),
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-[2px]">
          {specials.map((item, idx) =>
            item.student ? (
              <StudentCard
                key={idx}
                student={item.student}
                level={item.level}
                starLevel={item.starLevel}
                ueLevel={item.ueLevel}
              />
            ) : (
              <EmptyCard key={idx} />
            ),
          )}
        </div>
      </div>

      {damageChartOpen && (
        <div className="max-w-full overflow-x-auto">
          <PVPFormationDamageChart
            formation={formation}
            highestDamage={highestDamage}
          />
        </div>
      )}
    </div>
  );
}
