"use client";

import { StudentCard } from "@/components/common/student-card";
import type { Student } from "@prisma/client";
import type { RefObject } from "react";

import skillcardCopyGlow from "@/assets/images/skillcard_copy_glow.png";
import { cn } from "@/lib/utils";

type BaseItem = {
  type: "student" | "separator" | "text";
  id: string;
};

export type StudentItem = BaseItem & {
  type: "student";
  student: Student;
  trigger?: string;
  target?: Student;
  copy?: boolean;
  variantId?: string;
  notes?: string;
};

export type SeparatorItem = BaseItem & {
  type: "separator";
  orientation: "horizontal" | "vertical";
  size?: number;
};

export type TextItem = BaseItem & {
  type: "text";
  text: string;
};

export type TimelineItem = StudentItem | SeparatorItem | TextItem;

export type TimelinePreviewProps = {
  containerRef?: RefObject<HTMLDivElement | null>;
  items: TimelineItem[];
  itemSpacing?: number;
  verticalSeparatorSize?: number;
  horizontalSeparatorSize?: number;
  busy?: boolean;
  onItemClicked?: (item: TimelineItem) => void;
};

export function TimelinePreview({
  containerRef,
  items,
  itemSpacing = 10,
  verticalSeparatorSize = 20,
  horizontalSeparatorSize = 20,
  busy = false,
  onItemClicked,
}: TimelinePreviewProps) {
  function handleItemClicked(item: TimelineItem) {
    return () => {
      onItemClicked?.(item);
    };
  }

  function handleItemKeyUp(item: TimelineItem) {
    return (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        onItemClicked?.(item);
      }
    };
  }

  if (items.length === 0) {
    return (
      <div className="border rounded-md px-4 py-10 text-center text-xl text-muted-foreground">
        No items in timeline.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 items-start justify-center">
      <div className="flex items-center gap-3 px-4 py-18" ref={containerRef}>
        <div className="flex flex-col gap-1">
          <div className="flex items-start flex-wrap">
            {items.map((item, idx) => {
              if (item.type === "student") {
                return (
                  <div
                    className="cursor-pointer flex flex-col items-center"
                    key={item.id}
                    style={{
                      marginLeft:
                        idx === 0 || items[idx - 1].type !== "student"
                          ? undefined
                          : `${itemSpacing}px`,
                    }}
                    onClick={handleItemClicked(item)}
                    onKeyUp={handleItemKeyUp(item)}
                  >
                    <div className="relative">
                      {item.target && (
                        <div className="scale-75 absolute -bottom-14 left-1/2 -translate-x-1/2 -ml-2">
                          <StudentCard
                            isSkillCard
                            noDisplayRole
                            busy={busy}
                            student={item.target}
                          />
                        </div>
                      )}

                      <StudentCard
                        isSkillCard
                        noDisplayRole
                        busy={busy}
                        student={item.student}
                        variantId={item.variantId}
                      />

                      {item.copy && (
                        <img
                          src={skillcardCopyGlow.src}
                          alt=""
                          className="absolute top-0 left-0 right-0 bottom-0 skew-x-[-11deg]"
                        />
                      )}

                      {item.trigger && (
                        <div
                          className="absolute border-2 border-black dark:border-white top-0 left-[6px] skew-x-[-11deg] font-nexon-football-gothic font-bold text-lg px-1.5 bg-[#4b8fff] rounded-[2px] rounded-br-md z-10 text-white text-nowrap"
                          style={{
                            textShadow:
                              "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
                          }}
                        >
                          <div className="skew-x-[11deg]">{item.trigger}</div>
                        </div>
                      )}
                    </div>

                    {item.notes && (
                      <div
                        className={cn(
                          "font-nexon-football-gothic font-bold text-sm text-white px-3 cursor-pointer -ml-6 whitespace-pre-wrap text-center",
                          {
                            "mt-2": !item.target,
                            "mt-12": !!item.target,
                          },
                        )}
                        style={{
                          textShadow:
                            "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        {item.notes}
                      </div>
                    )}
                  </div>
                );
              }

              if (item.type === "separator") {
                return (
                  <div
                    key={item.id}
                    className="cursor-pointer"
                    onClick={handleItemClicked(item)}
                    onKeyUp={handleItemKeyUp(item)}
                    style={{
                      width:
                        item.orientation === "horizontal"
                          ? `${item.size ?? horizontalSeparatorSize}px`
                          : undefined,
                      height:
                        item.orientation === "vertical"
                          ? `${item.size ?? verticalSeparatorSize}px`
                          : undefined,
                      flexBasis:
                        item.orientation === "vertical" ? "100%" : undefined,
                    }}
                  />
                );
              }

              if (item.type === "text") {
                return (
                  <div
                    key={item.id}
                    className="text-center whitespace-pre-wrap h-[88px] flex items-center font-nexon-football-gothic font-bold text-lg text-white px-3 cursor-pointer"
                    onClick={handleItemClicked(item)}
                    onKeyUp={handleItemKeyUp(item)}
                    style={{
                      textShadow:
                        "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    {item.text}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
