"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AttemptProps {
  index: number;
  threeStarCount: number;
  onWantsToRemoveAttempt: (index: number) => void;
}

function Attempt({
  index,
  threeStarCount,
  onWantsToRemoveAttempt,
}: AttemptProps) {
  return (
    <div className="flex gap-2 items-center justify-between border mb-2 px-4 py-2">
      <div>
        <strong>Attempt #{index + 1}</strong>: got{" "}
        <strong>{threeStarCount}</strong> 3*s{" "}
      </div>

      <Button variant="outline" onClick={() => onWantsToRemoveAttempt(index)}>
        Remove
      </Button>
    </div>
  );
}

interface InfoBoxProps {
  main: string;
  description: string;
}

function InfoBox({ main, description }: InfoBoxProps) {
  return (
    <div className="flex flex-col gap-2 items-center justify-center">
      <h1 className="font-bold text-5xl">{main}</h1>
      <p className="text-xl">{description}</p>
    </div>
  );
}

interface CounterProps {
  attempts: number[];
}

function ThreeStarRate({ attempts }: CounterProps) {
  const total = attempts.length * 10;
  const totalThreeStars = attempts.reduce((acc, curr) => acc + curr, 0);
  const rate = total === 0 ? 0 : (totalThreeStars / total) * 100;

  return <InfoBox main={`${rate.toFixed(2)}%`} description="3* rate" />;
}

function TotalPulls({ attempts }: CounterProps) {
  return <InfoBox main={`${attempts.length * 10}`} description="total pulls" />;
}

function TotalThreeStars({ attempts }: CounterProps) {
  return (
    <InfoBox
      main={`${attempts.reduce((acc, curr) => acc + curr, 0)}`}
      description="total 3*s"
    />
  );
}

function Statistics({ attempts }: CounterProps) {
  return (
    <div className="flex gap-8 p-8 border-2 rounded-lg bg-accent/40">
      <ThreeStarRate attempts={attempts} />
      <TotalPulls attempts={attempts} />
      <TotalThreeStars attempts={attempts} />
    </div>
  );
}

export function GachaRateStatsView() {
  const [attempts, setAttempts] = useState<number[]>([]);

  function addAttempt(count: number) {
    setAttempts([...attempts, count]);
  }

  function removeAttempt(idx: number) {
    setAttempts(attempts.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex items-start justify-center pt-20">
      <div className="flex flex-col gap-20 items-center">
        <Statistics attempts={attempts} />

        <div className="flex flex-col items-center">
          <p className="mb-3">How many 3*s did you get on this attempt?</p>

          <div className="flex gap-3">
            {Array.from({ length: 11 }, (_, i) => (
              <Button key={`add-${i}`} size="sm" onClick={() => addAttempt(i)}>
                {i}
              </Button>
            ))}
          </div>
        </div>

        <div className="w-full flex flex-col max-h-64 overflow-y-auto">
          {attempts
            .slice(0)
            .reverse()
            .map((attempt, idx) => (
              <Attempt
                key={idx}
                index={attempts.length - idx - 1}
                threeStarCount={attempt}
                onWantsToRemoveAttempt={removeAttempt}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
