"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  clearTimeToRaidScore,
  secsToTimeString,
  type RaidDifficultyData,
  type RaidDuration,
} from "@/lib/raids";
import { PlusIcon, XIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export type MultiTeamCalculatorProps = {
  duration: RaidDuration;
  difficulty: RaidDifficultyData;
};

export function MultiTeamCalculator({
  duration,
  difficulty,
}: MultiTeamCalculatorProps) {
  const [clearTimes, setClearTimes] = useState<string[]>([""]);

  const handleAddClearTime = useCallback(() => {
    setClearTimes((prev) => [...prev, ""]);
  }, []);

  const handleClearTimeChange = useCallback(
    (index: number, newClearTime: string) => {
      setClearTimes((prev) => {
        const newClearTimes = [...prev];
        newClearTimes[index] = newClearTime;
        return newClearTimes;
      });
    },
    [],
  );

  const handleRemoveClearTime = useCallback((index: number) => {
    setClearTimes((prev) => {
      const newClearTimes = [...prev];
      newClearTimes.splice(index, 1);
      return newClearTimes;
    });
  }, []);

  const totalSecs = useMemo(() => {
    let clearTimeSecs = 0;

    for (const clearTime of clearTimes) {
      const normalizedClearTime = clearTime.trim();

      const components = normalizedClearTime.split(":");

      if (components.length === 1) {
        clearTimeSecs += Number.parseFloat(components[0]);
      } else if (components.length === 2) {
        const minutes = Number.parseInt(components[0], 10);
        const seconds = Number.parseFloat(components[1]);
        clearTimeSecs += minutes * 60 + seconds;
      } else {
        return 0;
      }

      if (Number.isNaN(clearTimeSecs)) {
        return 0;
      }
    }

    return clearTimeSecs;
  }, [clearTimes]);

  const formattedTotalTime = useMemo(() => {
    return secsToTimeString(totalSecs);
  }, [totalSecs]);

  const score = useMemo(() => {
    const raidScore = clearTimeToRaidScore(totalSecs, duration, difficulty);
    return raidScore ?? 0;
  }, [totalSecs, duration, difficulty]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-1">
          <div className="text-xl font-bold text-center">
            {score.toLocaleString("en-US")}pt
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <strong>Total Time:</strong> {formattedTotalTime}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {clearTimes.map((clearTime, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              type="text"
              value={clearTime}
              onChange={(e) => handleClearTimeChange(idx, e.target.value)}
              placeholder="min:sec.ms"
            />

            <Button
              variant="destructive"
              onClick={() => handleRemoveClearTime(idx)}
            >
              <XIcon />
            </Button>
          </div>
        ))}
      </div>

      <Button onClick={handleAddClearTime}>
        <PlusIcon /> Add Clear Time
      </Button>
    </div>
  );
}
