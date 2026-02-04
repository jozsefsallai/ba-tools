"use client";

import { CountdownTimer } from "@/components/common/countdown-timer";
import {
  currentClosestCafeBreakpointJST,
  currentClosestCafeHeadpatBreakpointJST,
  currentTimeJST,
  resetTimeForDateJST,
} from "@/lib/date";
import { useEffect, useState } from "react";

function getResetDate(): Date {
  const now = currentTimeJST();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return resetTimeForDateJST(tomorrow);
}

function getNextCafeResetDate(): Date {
  const breakPoint = currentClosestCafeBreakpointJST();
  const nextBreakPoint = new Date(breakPoint);
  nextBreakPoint.setHours(nextBreakPoint.getHours() + 12);
  return nextBreakPoint;
}

function getNextHeadpatResetDate(): Date {
  const breakPoint = currentClosestCafeHeadpatBreakpointJST();
  const nextBreakPoint = new Date(breakPoint);
  nextBreakPoint.setHours(nextBreakPoint.getHours() + 3);
  return nextBreakPoint;
}

export function ResetInfo() {
  const [resetDate, setResetDate] = useState<Date | null>(null);
  const [cafeResetDate, setCafeResetDate] = useState<Date | null>(null);
  const [headpatResetDate, setHeadpatResetDate] = useState<Date | null>(null);

  function onResetComplete() {
    const newResetDate = getResetDate();
    setResetDate(newResetDate);
  }

  function onCafeResetComplete() {
    const newCafeResetDate = getNextCafeResetDate();
    setCafeResetDate(newCafeResetDate);
  }

  function onHeadpatResetComplete() {
    const newHeadpatResetDate = getNextHeadpatResetDate();
    setHeadpatResetDate(newHeadpatResetDate);
  }

  useEffect(() => {
    const newResetDate = getResetDate();
    setResetDate(newResetDate);

    const newCafeResetDate = getNextCafeResetDate();
    setCafeResetDate(newCafeResetDate);

    const newHeadpatResetDate = getNextHeadpatResetDate();
    setHeadpatResetDate(newHeadpatResetDate);
  }, []);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl">Reset Time Information</h2>

      <div className="flex flex-col items-center gap-4 px-6 py-4 border rounded-md bg-card">
        {resetDate && (
          <div className="flex flex-col items-center">
            <div className="text-sm text-muted-foreground">Next reset in:</div>

            <CountdownTimer
              targetTime={resetDate}
              className="text-3xl"
              onComplete={onResetComplete}
            />
          </div>
        )}

        {cafeResetDate && (
          <div className="flex flex-col items-center">
            <div className="text-sm text-muted-foreground">
              Next cafe reset in:
            </div>

            <CountdownTimer
              targetTime={cafeResetDate}
              className="text-3xl"
              onComplete={onCafeResetComplete}
            />
          </div>
        )}

        {headpatResetDate && (
          <div className="flex flex-col items-center">
            <div className="text-sm text-muted-foreground">
              Headpat cooldown ends in:
            </div>

            <CountdownTimer
              targetTime={headpatResetDate}
              className="text-3xl"
              onComplete={onHeadpatResetComplete}
            />
          </div>
        )}
      </div>
    </section>
  );
}
