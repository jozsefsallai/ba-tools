import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  lessonsFavorTable,
  type LessonsFavorTableEntry,
} from "@/lib/favor-table";
import { useMemo } from "react";

export type LessonsTableProps = {
  exp: number;
};

export type LessonsEntry = {
  lesson: LessonsFavorTableEntry;
  count: number;
  countWithBonus: number;
  expectedCount: number;
};

export function LessonsTable({ exp }: LessonsTableProps) {
  const lessonsNeeded = useMemo<LessonsEntry[]>(() => {
    return lessonsFavorTable.map((lesson) => ({
      lesson,
      count: Math.ceil(exp / lesson.exp),
      countWithBonus: Math.ceil(exp / (lesson.exp + lesson.bonusExp)),
      expectedCount: Math.ceil(
        exp / (lesson.exp + lesson.bonusExp * lesson.bonusChance),
      ),
    }));
  }, [exp]);

  // Area | Level | Exp | Bonus | Count

  return (
    <div className="flex flex-col gap-4">
      <div className="font-semibold">Lessons Breakdown</div>

      <div className="text-xs text-muted-foreground">
        If you wanted to gain <strong>{exp} EXP</strong> through lessons alone,
        here's how many lessons it would take you at each rank and level.
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>EXP</TableHead>
            <TableHead>Bonus EXP</TableHead>
            <TableHead>Count</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {lessonsNeeded.map(
            ({ lesson, count, countWithBonus, expectedCount }) => (
              <TableRow key={`${lesson.minRank}-${lesson.maxRank}`}>
                <TableCell className="align-top">
                  {lesson.minRank === lesson.maxRank
                    ? lesson.minRank
                    : `${lesson.minRank} - ${lesson.maxRank}`}
                </TableCell>

                <TableCell className="align-top">{lesson.level}</TableCell>

                <TableCell className="align-top">{lesson.exp}</TableCell>

                <TableCell className="align-top">
                  <div>
                    {lesson.bonusExp}{" "}
                    <span className="text-xs text-muted-foreground">
                      (total {lesson.exp + lesson.bonusExp})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong>{(lesson.bonusChance * 100).toFixed(0)}%</strong>{" "}
                    chance
                  </div>
                </TableCell>

                <TableCell className="align-top">
                  <div>{count}</div>
                  <div className="text-xs text-muted-foreground">
                    With bonus: <strong>{countWithBonus}</strong>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expected: <strong>{expectedCount}</strong>
                  </div>
                </TableCell>
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    </div>
  );
}
