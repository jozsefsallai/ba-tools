"use client";

import { PVPFormationDamageChart } from "@/app/pvp/_components/pvp-formation-damage-chart";
import type { PVPMatchResult, PVPMatchType } from "@/app/pvp/_lib/types";
import { EmptyCard } from "@/components/common/empty-card";
import { StudentCard } from "@/components/common/student-card";
import { useStudents } from "@/hooks/use-students";
import { buildStudentPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Student } from "~prisma";
import { ShieldIcon, SwordIcon } from "lucide-react";
import { useMemo } from "react";
import type { Doc } from "~convex/dataModel";

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
}: PVPFormationProps) {
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
    <div className="flex flex-col gap-2 items-center">
      <div className="flex items-center gap-2">
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
          {result === "win" ? "WIN" : "LOSE"}
        </div>

        {studentRep && studentPortraitUrl && (
          <img src={studentPortraitUrl} alt={studentRep.name} className="h-6" />
        )}

        <div className="font-bold">{name}</div>

        <div className="text-sm text-muted-foreground">
          (rank: <PVPRank rank={rank} />)
        </div>
      </div>

      <div className="flex items-center gap-3" style={{ zoom: 0.8 }}>
        <div className="flex items-center gap-[2px]">
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

        <div className="flex items-center gap-[2px]">
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
        <PVPFormationDamageChart
          formation={formation}
          highestDamage={highestDamage}
        />
      )}
    </div>
  );
}
