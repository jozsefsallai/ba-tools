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
import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

export type BannerItemProps = {
  banner: GameBanner & {
    pickupStudents: Student[];
  };
};

export function BannerItem({ banner }: BannerItemProps) {
  const t = useTranslations();
  const hasFestStudent = banner.pickupStudents.some(
    (student) => student.isFestGlobal,
  );

  return (
    <div
      className={cn(
        "border rounded-md p-4 shadow-lg flex flex-col gap-4 bg-card relative overflow-hidden",
        {
          "border-primary/75": hasFestStudent,
        },
      )}
    >
      {hasFestStudent && (
        <div className="bg-gradient-to-r from-transparent via-primary/15 dark:via-primary/35 to-transparent w-4/5 absolute left-2/5 -skew-x-[45deg] top-0 bottom-0" />
      )}

      {banner.pickupStudents.map((student, idx) => (
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
                          <Badge>{t("static.banners.item.fest")}</Badge>
                        </TooltipTrigger>

                        <TooltipContent className="text-center">
                          {t.rich("static.banners.item.festTooltip", {
                            strong: (chunks) => <strong>{chunks}</strong>,
                            br: () => <br />,
                          })}
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

                    {banner.freePulls > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline">
                            {t("static.banners.item.freePulls", {
                              count: banner.freePulls,
                            })}
                          </Badge>
                        </TooltipTrigger>

                        <TooltipContent className="text-center">
                          {t.rich(
                            "static.banners.item.freePullsTooltip",
                            {
                              strong: (chunks) => <strong>{chunks}</strong>,
                              br: () => <br />,
                              count: banner.freePulls,
                            },
                          )}
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
            </TooltipProvider>
          </div>

          {idx < banner.pickupStudents.length - 1 && (
            <Separator className="mb-1" />
          )}
        </Fragment>
      ))}
    </div>
  );
}
