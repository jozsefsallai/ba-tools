import { StudentCard } from "@/components/common/student-card";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import { Link } from "@/i18n/navigation";
import { useMemo } from "react";
import type { Doc } from "~convex/dataModel";
import type { Student } from "~prisma";

export type OwnTimelineEntryProps = {
  entry: Doc<"timeline">;
};

export function TimelineGroupEntry({ entry }: OwnTimelineEntryProps) {
  const { students: allStudents } = useStudents();

  const uniqueStudents = useMemo<Student[]>(() => {
    const studentIds = new Set<string>();

    for (const item of entry.items) {
      if (item.type === "student") {
        studentIds.add(item.studentId);
      }
    }

    return allStudents.filter((student) => studentIds.has(student.id));
  }, [allStudents, entry.items]);

  return (
    <article className="border bg-background rounded-md py-4 px-8 flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch max-md:px-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {entry.name && (
              <div className="text-lg font-semibold">{entry.name}</div>
            )}

            {!entry.name && (
              <div className="text-lg font-semibold text-muted-foreground italic">
                (Untitled Timeline)
              </div>
            )}
          </div>

          <div className="flex gap-1 items-center max-md:flex-wrap">
            {uniqueStudents.map((student) => (
              <div style={{ zoom: 0.55 }} key={student.id}>
                <StudentCard student={student} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 max-md:flex-wrap max-md:gap-2">
        {entry.visibility === "public" && (
          <Button asChild>
            <Link href={`/timelines/${entry._id}`}>View</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
