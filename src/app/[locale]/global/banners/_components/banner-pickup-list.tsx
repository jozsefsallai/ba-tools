"use client";

import type { BannerStudent } from "@/app/[locale]/global/banners/types";
import { StudentCard } from "@/components/common/student-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useState } from "react";

export function BannerPickupList({
  students,
  isSelectablePickup,
  freePulls,
  collapsedCount,
}: {
  students: BannerStudent[];
  isSelectablePickup: boolean;
  freePulls: number;
  collapsedCount: number;
}) {
  const t = useTranslations();
  const canCollapse = students.length > collapsedCount;
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedStudents =
    canCollapse && !isExpanded ? students.slice(0, collapsedCount) : students;

  return (
    <>
      {displayedStudents.map((student, idx) => (
        <Fragment key={student.id}>
          <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between relative">
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
                        <Badge>{t("static.banners.item.fest")}</Badge>
                      </TooltipTrigger>

                      <TooltipContent className="text-center">
                        {t.rich(
                          isSelectablePickup
                            ? "static.banners.item.festTooltip2"
                            : "static.banners.item.festTooltip",
                          {
                            strong: (chunks) => <strong>{chunks}</strong>,
                            br: () => <br />,
                          },
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {student.isLimitedGlobal && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge>{t("static.banners.item.limited")}</Badge>
                      </TooltipTrigger>

                      <TooltipContent>
                        {t.rich("static.banners.item.limitedTooltip", {
                          strong: (chunks) => <strong>{chunks}</strong>,
                        })}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {freePulls > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline">
                          {t("static.banners.item.freePulls", {
                            count: freePulls,
                          })}
                        </Badge>
                      </TooltipTrigger>

                      <TooltipContent className="text-center">
                        {t.rich("static.banners.item.freePullsTooltip", {
                          strong: (chunks) => <strong>{chunks}</strong>,
                          br: () => <br />,
                          count: freePulls,
                        })}
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
                    <span className="md:hidden">
                      {t("static.banners.item.viewOnSchaleDB")}
                    </span>
                  </a>
                </Button>
              </TooltipTrigger>

              <TooltipContent>
                {t.rich("static.banners.item.viewStudentOnSchaleDB", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                  name: student.name,
                })}
              </TooltipContent>
            </Tooltip>
          </div>

          {idx < displayedStudents.length - 1 && (
            <div className="border-border shrink-0 bg-border h-px w-full mb-1" />
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
    </>
  );
}
