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
import { useTranslations } from "next-intl";
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
  const t = useTranslations();

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
      <div className="font-semibold">{t("tools.bond.lessons.title")}</div>

      <div className="text-xs text-muted-foreground">
        {t.rich("tools.bond.lessons.description", {
          strong: (children) => <strong>{children}</strong>,
          exp,
        })}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("tools.bond.lessons.table.rank")}</TableHead>
            <TableHead>{t("tools.bond.lessons.table.level")}</TableHead>
            <TableHead>{t("tools.bond.lessons.table.exp")}</TableHead>
            <TableHead>{t("tools.bond.lessons.table.bonus")}</TableHead>
            <TableHead>{t("tools.bond.lessons.table.count")}</TableHead>
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
                      {t("tools.bond.lessons.total", {
                        exp: lesson.exp + lesson.bonusExp,
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.rich("tools.bond.lessons.bonusChance", {
                      strong: (children) => <strong>{children}</strong>,
                      chance: (lesson.bonusChance * 100).toFixed(0),
                    })}
                  </div>
                </TableCell>

                <TableCell className="align-top">
                  <div>{count}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.rich("tools.bond.lessons.counts.withBonus", {
                      strong: (children) => <strong>{children}</strong>,
                      countWithBonus,
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.rich("tools.bond.lessons.counts.expected", {
                      strong: (children) => <strong>{children}</strong>,
                      expectedCount,
                    })}
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
