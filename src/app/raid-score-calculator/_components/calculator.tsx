"use client";

import { MultiTeamCalculator } from "@/app/raid-score-calculator/_components/multi-team-calculator";
import { SingleTeamCalculator } from "@/app/raid-score-calculator/_components/single-team-calculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RAID_DIFFICULTY_DATA,
  RAID_DURATIONS,
  type RaidDifficultyData,
  type RaidDuration,
} from "@/lib/raids";
import { useCallback, useState } from "react";

type CalculatorMode = "single" | "multi";

export function RaidScoreCalculator() {
  const [duration, setDuration] = useState<RaidDuration>(180);
  const [difficulty, setDifficulty] = useState<RaidDifficultyData>(
    RAID_DIFFICULTY_DATA[0],
  );

  const [mode, setMode] = useState<CalculatorMode>("single");

  const handleRaidDurationStrChange = useCallback((value: string) => {
    setDuration(Number.parseInt(value, 10) as RaidDuration);
  }, []);

  const handleRaidDifficultyChange = useCallback((value: string) => {
    const newDifficulty = RAID_DIFFICULTY_DATA.find(
      (diff) => diff.difficulty === value,
    );

    if (newDifficulty) {
      setDifficulty(newDifficulty);
    }
  }, []);

  return (
    <div className="mx-auto w-3xl max-w-full flex flex-col gap-6">
      <Tabs
        value={duration.toString()}
        onValueChange={handleRaidDurationStrChange}
      >
        <TabsList className="w-full h-auto items-stretch flex-col gap-2 md:flex-row md:gap-0">
          {RAID_DURATIONS.map((dur) => (
            <TabsTrigger
              key={dur.value}
              value={dur.value.toString()}
              className="h-auto whitespace-pre-wrap"
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-xl">{dur.label}</div>

                <div className="text-xs">{dur.raids.join(", ")}</div>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Tabs
        value={difficulty.difficulty}
        onValueChange={handleRaidDifficultyChange}
      >
        <TabsList className="w-full h-auto items-stretch grid grid-cols-4 gap-2 sm:flex sm:gap-0">
          {RAID_DIFFICULTY_DATA.map((diff) => (
            <TabsTrigger
              key={diff.difficulty}
              value={diff.difficulty}
              className="h-auto"
            >
              {diff.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as CalculatorMode)}
      >
        <TabsList className="w-full">
          <TabsTrigger value="single">Single Team Mode</TabsTrigger>
          <TabsTrigger value="multi">Multiple Teams Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-4">
          <SingleTeamCalculator duration={duration} difficulty={difficulty} />
        </TabsContent>

        <TabsContent value="multi" className="mt-4">
          <MultiTeamCalculator duration={duration} difficulty={difficulty} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
