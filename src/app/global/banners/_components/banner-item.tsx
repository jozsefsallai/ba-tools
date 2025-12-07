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
import { Fragment } from "react";

export type BannerItemProps = {
  banner: GameBanner & {
    pickupStudents: Student[];
  };
};

export function BannerItem({ banner }: BannerItemProps) {
  return (
    <div className="border rounded-md p-4 shadow-lg flex flex-col gap-4 bg-card">
      {banner.pickupStudents.map((student, idx) => (
        <Fragment key={student.id}>
          <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
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
                          The rate of obtaining a 3* student on this banner is{" "}
                          <strong>doubled (6%)</strong>
                          <br />
                          and there is a small chance of obtaining other FEST
                          students on this banner.
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {student.isLimitedGlobal && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge>Limited</Badge>
                        </TooltipTrigger>

                        <TooltipContent>
                          This student is a <strong>LIMITED unit</strong> and
                          cannot be obtained outside of their banner.
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
                          During the duration of this banner, you will receive{" "}
                          <strong>daily free pulls</strong> for a total of{" "}
                          <strong>{banner.freePulls}</strong>.<br />
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

          {idx < banner.pickupStudents.length - 1 && (
            <Separator className="mb-1" />
          )}
        </Fragment>
      ))}
    </div>
  );
}
