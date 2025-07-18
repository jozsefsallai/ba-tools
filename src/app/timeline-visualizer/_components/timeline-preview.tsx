"use client";

import { StudentCard } from "@/components/common/student-card";
import type { Student } from "@prisma/client";
import type { RefObject } from "react";

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
};

export type SeparatorItem = BaseItem & {
  type: "separator";
  orientation: "horizontal" | "vertical";
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
          <div className="flex items-center flex-wrap">
            {items.map((item, idx) => {
              if (item.type === "student") {
                return (
                  <div
                    className="relative cursor-pointer"
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
                    {item.target && (
                      <div
                        className="scale-75 absolute -bottom-16 left-1/2 -translate-x-1/2"
                        style={{
                          marginLeft:
                            idx === 0 || items[idx - 1].type !== "student"
                              ? "-8px"
                              : itemSpacing < 0
                                ? `${itemSpacing + 8}px`
                                : "-8px",
                        }}
                      >
                        <StudentCard
                          noDisplayRole
                          busy={busy}
                          student={item.target}
                        />
                      </div>
                    )}

                    <StudentCard
                      noDisplayRole
                      busy={busy}
                      student={item.student}
                    />

                    {item.trigger && (
                      <div
                        className="absolute -top-3 -left-2 font-nexon-football-gothic font-bold text-xl px-1.5 py-0.5 bg-[#4b8fff] rounded-md z-10 text-white text-nowrap"
                        style={{
                          textShadow:
                            "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        {item.trigger}
                      </div>
                    )}

                    {item.copy && (
                      <div
                        className="absolute -bottom-1 -left-2 font-nexon-football-gothic font-bold text-lg px-1.5 py-0.5 bg-[#ffa24b] rounded-md z-10 text-white"
                        style={{
                          textShadow:
                            "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        C
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
                          ? `${horizontalSeparatorSize}px`
                          : undefined,
                      height:
                        item.orientation === "vertical"
                          ? `${verticalSeparatorSize}px`
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
                    className="font-nexon-football-gothic font-bold text-lg text-white px-3 cursor-pointer"
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
