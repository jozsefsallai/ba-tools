"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearTimeToRaidScore,
  type RaidDifficultyData,
  type RaidDuration,
  raidScoreToClearTime,
  secsToTimeString,
} from "@/lib/raids";
import { useCallback, useState } from "react";

export type SingleTeamCalculatorProps = {
  duration: RaidDuration;
  difficulty: RaidDifficultyData;
};

export function SingleTeamCalculator({
  duration,
  difficulty,
}: SingleTeamCalculatorProps) {
  const [clearTime, setClearTime] = useState<string>("");
  const [remainingTime, setRemainingTime] = useState<string>("");
  const [raidScore, setRaidScore] = useState<string>("");

  const handleClearTimeChange = useCallback(
    (newClearTime: string) => {
      setClearTime(newClearTime);

      const normalizedClearTime = newClearTime.trim();

      let clearTimeSecs = 0;

      const components = normalizedClearTime.split(":");

      if (components.length === 1) {
        clearTimeSecs = Number.parseFloat(components[0]);
      } else if (components.length === 2) {
        const minutes = Number.parseInt(components[0], 10);
        const seconds = Number.parseFloat(components[1]);
        clearTimeSecs = minutes * 60 + seconds;
      } else {
        return;
      }

      if (Number.isNaN(clearTimeSecs)) {
        return;
      }

      const newRemainingTimeSecs = duration - clearTimeSecs;
      if (newRemainingTimeSecs >= 0) {
        setRemainingTime(secsToTimeString(newRemainingTimeSecs));
      }

      const raidScore = clearTimeToRaidScore(
        clearTimeSecs,
        duration,
        difficulty,
      );

      if (raidScore === null) {
        return;
      }

      setRaidScore(raidScore.toLocaleString("en-US"));
    },
    [duration, difficulty],
  );

  const handleRemainingTimeChange = useCallback(
    (newRemainingTime: string) => {
      setRemainingTime(newRemainingTime);

      const normalizedRemainingTime = newRemainingTime.trim();

      let remainingTimeSecs = 0;

      const components = newRemainingTime.split(":");

      if (components.length === 1) {
        remainingTimeSecs = Number.parseFloat(components[0]);
      } else if (components.length === 2) {
        const minutes = Number.parseInt(components[0], 10);
        const seconds = Number.parseFloat(components[1]);
        remainingTimeSecs = minutes * 60 + seconds;
      } else {
        return;
      }

      if (Number.isNaN(remainingTimeSecs)) {
        return;
      }

      const clearTimeSecs = duration - remainingTimeSecs;
      setClearTime(secsToTimeString(clearTimeSecs));

      const raidScore = clearTimeToRaidScore(
        clearTimeSecs,
        duration,
        difficulty,
      );

      if (raidScore === null) {
        return;
      }

      setRaidScore(raidScore.toLocaleString("en-US"));
    },
    [duration, difficulty],
  );

  const handleRaidScoreChange = useCallback(
    (newRaidScore: string) => {
      setRaidScore(newRaidScore);

      const parsedRaidScore = Number.parseInt(
        newRaidScore.replace(/,/g, ""),
        10,
      );

      if (Number.isNaN(parsedRaidScore)) {
        return;
      }

      const clearTimeSecs = raidScoreToClearTime(
        parsedRaidScore,
        duration,
        difficulty,
      );

      setClearTime(secsToTimeString(clearTimeSecs));

      const remainingTimeSecs = duration - clearTimeSecs;
      if (remainingTimeSecs >= 0) {
        setRemainingTime(secsToTimeString(remainingTimeSecs));
      }
    },
    [duration, difficulty],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="clearTime">Clear Time</Label>

        <Input
          id="clearTime"
          placeholder="e.g. 2:34.567"
          value={clearTime}
          onChange={(e) => handleClearTimeChange(e.target.value)}
        />

        <div className="text-xs text-muted-foreground">
          The total clear time of the raid, sum of times from all teams.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="remainingTime">Remaining Time</Label>

        <Input
          id="remainingTime"
          placeholder="e.g. 0:25.433"
          value={remainingTime}
          onChange={(e) => handleRemainingTimeChange(e.target.value)}
        />

        <div className="text-xs text-muted-foreground">
          The remaining time a team has when reaching 0 HP. This is niche and
          only useful for 1-team clears.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="raidScore">Raid Score</Label>

        <Input
          id="raidScore"
          placeholder="Raid Score"
          value={raidScore}
          onChange={(e) => handleRaidScoreChange(e.target.value)}
        />

        <div className="text-xs text-muted-foreground">
          The raid score value. Can only be a number. Commas not required,
          supports decimal values.
        </div>
      </div>
    </div>
  );
}
