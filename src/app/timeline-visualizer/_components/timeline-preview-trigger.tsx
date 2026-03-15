"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type TimelinePreviewTriggerProps = {
  trigger: string;
  busy?: boolean;
};

const CJK_REGEX =
  /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;

export function TimelinePreviewTrigger({
  trigger,
  busy,
}: TimelinePreviewTriggerProps) {
  const isFirefox = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      /firefox/i.test(window.navigator.userAgent)
    );
  }, []);

  const containsCJK = useMemo(() => {
    return CJK_REGEX.test(trigger);
  }, [trigger]);

  return (
    <div
      className="absolute border-2 border-black dark:border-white top-0 left-[6px] skew-x-[-11deg] font-nexon-football-gothic font-bold text-lg px-1.5 bg-[#4b8fff] rounded-[2px] rounded-br-md z-10 text-white text-nowrap h-[30px] overflow-y-hidden"
      style={{
        textShadow:
          "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        className={cn("skew-x-[11deg] leading-[26px]", {
          "-mt-[2px]": busy,
          "mt-[2px]": busy && containsCJK && isFirefox,
        })}
      >
        {trigger}
      </div>
    </div>
  );
}
