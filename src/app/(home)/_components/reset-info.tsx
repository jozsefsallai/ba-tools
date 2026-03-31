"use client";

import { CountdownTimer } from "@/components/common/countdown-timer";
import {
  currentClosestCafeBreakpointJST,
  currentClosestCafeHeadpatBreakpointJST,
  currentTimeJST,
  resetTimeForDateJST,
} from "@/lib/date";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
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
      <h2 className="text-2xl font-heading text-[#ff00ff] dark:text-[#00ffff] border-b-4 border-dashed border-[#00ff00] pb-1">
        {t("tools.resetInfo.title")}
      </h2>

      <div className="flex flex-col items-center gap-4 px-6 py-4 border-4 border-[#ff0000] rounded-none bg-[#ffeeee] dark:bg-[#330000]">
        {resetDate && (
          <div className="flex flex-col items-center">
            <div className="text-sm times-new-roman font-bold text-[#000080] dark:text-[#00ff00]">
              {t("tools.resetInfo.nextReset")}
            </div>

            <CountdownTimer
              targetTime={resetDate}
              className="text-3xl times-new-roman font-bold blink text-[#ff0000]"
              onComplete={onResetComplete}
            />
          </div>
        )}

        {cafeResetDate && (
          <div className="flex flex-col items-center">
            <div className="text-sm times-new-roman font-bold text-[#660099] dark:text-[#ff99ff]">
              {t("tools.resetInfo.nextCafeReset")}
            </div>

            <CountdownTimer
              targetTime={cafeResetDate}
              className="text-3xl times-new-roman font-bold blink text-[#ff0000]"
              onComplete={onCafeResetComplete}
            />
          </div>
        )}

        {headpatResetDate && (
          <div className="flex flex-col items-center">
            <div className="text-sm times-new-roman font-bold text-[#006600] dark:text-[#00ff00]">
              {t("tools.resetInfo.headpatCooldown")}
            </div>

            <CountdownTimer
              targetTime={headpatResetDate}
              className="text-3xl times-new-roman font-bold blink text-[#ff0000]"
              onComplete={onHeadpatResetComplete}
            />
          </div>
        )}
      </div>
    </section>
  );
}
