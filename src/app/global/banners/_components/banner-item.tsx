import { StudentCard } from "@/components/common/student-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GameBanner, Student } from "@prisma/client";

export type BannerItemProps = {
  banner: GameBanner & {
    pickupStudents: Student[];
  };
};

export function BannerItem({ banner }: BannerItemProps) {
  return (
    <div className="border rounded-md p-4">
      {banner.pickupStudents.map((student) => (
        <div
          key={student.id}
          className="flex flex-col md:flex-row gap-4 md:items-center justify-between"
        >
          <div className="flex items-center gap-4 md:gap-6">
            <StudentCard student={student} />

            <div className="flex flex-col gap-2">
              <div className="md:text-xl font-bold">{student.name}</div>

              <div className="flex items-center gap-4">
                {student.isLimitedGlobal && <Badge>Limited</Badge>}

                {banner.freePulls > 0 && (
                  <Badge variant="outline">{banner.freePulls} Free Pulls</Badge>
                )}
              </div>
            </div>
          </div>

          <Button asChild variant="outline">
            <a
              href={`https://schaledb.com/student/${student.schaleDbId}`}
              target="_blank"
              rel="noreferrer"
            >
              View on SchaleDB
            </a>
          </Button>
        </div>
      ))}
    </div>
  );
}
