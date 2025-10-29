"use client";

import { ChartContainer } from "@/components/ui/chart";
import { useStudents } from "@/hooks/use-students";
import { useCallback, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import type { Doc } from "~convex/dataModel";

export type PVPFormationDamageChartProps = {
  formation: Array<Doc<"pvpMatchRecord">["ownTeam"][number]>;
  highestDamage: number;
};

const chartConfig = {
  damage: {
    label: "Damage",
  },
};

export function PVPFormationDamageChart({
  formation,
  highestDamage,
}: PVPFormationDamageChartProps) {
  const { studentMap } = useStudents();

  const chartData = useMemo(() => {
    return formation.map((item) => ({
      student: item.studentId,
      damage: item.damage ?? 0,
    }));
  }, [formation]);

  const StudentNameTick = useCallback(
    ({ x, y, payload }: any) => {
      const name = studentMap[payload.value]?.name ?? payload.value;
      const labels = name.split(" ") as string[];

      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={16} fill="#666" textAnchor="middle">
            {labels.map((item, i) => (
              <tspan key={i} x="0" dy={`${i === 0 ? 0 : 1.2}em`}>
                {item}
              </tspan>
            ))}
          </text>
        </g>
      );
    },
    [studentMap],
  );

  return (
    <ChartContainer config={chartConfig} className="w-[450px] h-[300px]">
      <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
        <CartesianGrid vertical={false} />

        <XAxis
          interval={0}
          dataKey="student"
          tick={StudentNameTick}
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          height={50}
        />

        <YAxis hide type="number" domain={[0, highestDamage]} />

        <Bar
          dataKey="damage"
          fill="#ffffff"
          radius={4}
          barSize={30}
          label={{ position: "top" }}
        >
          {chartData.map((_, idx) => (
            <Cell key={`cell-${idx}`} fill={idx < 4 ? "#f34a23" : "#017efe"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
