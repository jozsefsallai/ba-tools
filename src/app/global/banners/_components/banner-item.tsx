"use client";

import { StudentCard } from "@/components/common/student-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { GameBanner, Student } from "~prisma";
import { ChevronDown, ChevronUp, InfoIcon } from "lucide-react";
import { Fragment, useState } from "react";

const PICKUP_STUDENTS_COLLAPSED_COUNT = 3;

export type BannerItemProps = {
  banner: GameBanner & {
    pickupStudents: Student[];
  };
};

export function BannerItem({ banner }: BannerItemProps) {
  const hasFestStudent = banner.pickupStudents.some(
    (student) => student.isFestGlobal,
  );

  const canCollapse =
    banner.pickupStudents.length > PICKUP_STUDENTS_COLLAPSED_COUNT;
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedStudents =
    canCollapse && !isExpanded
      ? banner.pickupStudents.slice(0, PICKUP_STUDENTS_COLLAPSED_COUNT)
      : banner.pickupStudents;

  return (
    <div>
      {banner.name && (
        <div className="text-xs font-bold text-muted-foreground uppercase text-center px-2 py-1 pb-4 border bg-background/80 rounded-md">
          {banner.name}
        </div>
      )}

      <div
        className={cn(
          "border rounded-md p-4 shadow-lg bg-card relative overflow-hidden",
          {
            "border-primary/75": hasFestStudent && !banner.isSelectablePickup,
            "-mt-3": banner.name,
          },
        )}
      >
        {hasFestStudent && !banner.isSelectablePickup && (
          <div className="bg-gradient-to-r from-transparent via-primary/15 dark:via-primary/35 to-transparent w-4/5 absolute left-2/5 -skew-x-[45deg] top-0 bottom-0" />
        )}

        <div className="relative flex flex-col gap-4">
          {banner.isSelectablePickup && (
            <>
              <div className="text-sm text-muted-foreground text-center">
                On this banner, you can select any of the following characters
                as a pickup student:
              </div>

              <Separator className="mb-2" />
            </>
          )}

          {displayedStudents.map((student, idx) => (
            <Fragment key={student.id}>
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between relative">
                <TooltipProvider>
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="relative">
                      <div style={{ zoom: 0.85 }}>
                        <StudentCard student={student} />
                      </div>

                      <Badge
                        className={cn(
                          "absolute -top-2 -left-2 border-2 border-white shadow-md",
                          {
                            "bg-purple-700": student.rarity === 3,
                            "bg-yellow-700": student.rarity === 2,
                            "bg-blue-700": student.rarity === 1,
                          },
                        )}
                      >
                        {student.rarity}★
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="md:text-xl font-bold">{student.name}</div>

                      <div className="flex items-center gap-4">
                        {student.isFestGlobal && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge>FEST</Badge>
                            </TooltipTrigger>

                            <TooltipContent className="text-center">
                              This student is a <strong>FEST</strong> unit.
                              <br />
                              {!banner.isSelectablePickup && (
                                <>
                                  The rate of obtaining a 3* student on this
                                  banner is <strong>doubled (6%)</strong>
                                  <br />
                                  and there is a small chance of obtaining other
                                  FEST students on this banner.
                                </>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {student.isLimitedGlobal && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge>Limited</Badge>
                            </TooltipTrigger>

                            <TooltipContent>
                              This student is a <strong>LIMITED unit</strong>{" "}
                              and cannot be obtained outside of their banner.
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {banner.freePulls > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline">
                                {banner.freePulls} Free Pulls
                              </Badge>
                            </TooltipTrigger>

                            <TooltipContent className="text-center">
                              During the duration of this banner, you will
                              receive <strong>daily free pulls</strong> for a
                              total of <strong>{banner.freePulls}</strong>.
                              <br />
                              The free pulls can be used on this banner and{" "}
                              <strong>
                                will will not carry over to future banners
                              </strong>
                              .
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`https://schaledb.com/student/${student.schaleDbId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <InfoIcon />
                          <span className="md:hidden">View on SchaleDB</span>
                        </a>
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent>
                      View <strong>{student.name}</strong> on SchaleDB
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {idx < displayedStudents.length - 1 && (
                <Separator className="mb-1" />
              )}
            </Fragment>
          ))}

          {canCollapse && (
            <>
              {!isExpanded && (
                <div
                  className="absolute inset-x-0 -left-2 -right-2 bottom-0 h-32 pointer-events-none"
                  aria-hidden
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent 0%, var(--card) 75%)",
                  }}
                />
              )}

              <div className="relative z-10 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsExpanded((prev) => !prev)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 mr-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 mr-1" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
