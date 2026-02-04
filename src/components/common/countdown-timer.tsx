"use client";

import { SlidingNumber } from "@/components/common/sliding-number";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type CountdownTimerProps = {
  targetTime: Date;
  onComplete?: () => void;
  className?: string;
};

export function CountdownTimer({
  targetTime,
  onComplete,
  className,
}: CountdownTimerProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setHours(0);
        setMinutes(0);
        setSeconds(0);

        if (onComplete) {
          onComplete();
        }

        clearInterval(interval);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      setHours(hrs);
      setMinutes(mins);
      setSeconds(secs);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <SlidingNumber value={hours} padStart />
      <span>:</span>
      <SlidingNumber value={minutes} padStart />
      <span>:</span>
      <SlidingNumber value={seconds} padStart />
    </div>
  );
}
