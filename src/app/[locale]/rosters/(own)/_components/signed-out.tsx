"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SignedOutToolView } from "@/components/auth/signed-out-tool-view";
import { StudentCard } from "@/components/common/student-card";
import { useStudents } from "@/hooks/use-students";
import {
  GAME_SERVER_NAMES,
  STAR_LEVELS,
  type StarLevel,
  type Student,
  UE_LEVELS,
  type UELevel,
} from "@/lib/types";

const EXAMPLE_COUNT = 6;
const EXAMPLE_LEVEL = 90;

type ExampleStudent = {
  student: Student;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
};

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Picks random students with a random progress each. A student never goes
 * below the stars they're recruited with, and one at 5★ shows their unique
 * equipment level instead, like in the game.
 */
function pickExampleStudents(students: Student[]): ExampleStudent[] {
  const pool = [
    ...students,
  ];

  const picks: ExampleStudent[] = [];

  while (picks.length < EXAMPLE_COUNT && pool.length > 0) {
    const [student] = pool.splice(Math.floor(Math.random() * pool.length), 1);

    const progress = randomItem([
      ...STAR_LEVELS.filter((star) => star >= student.rarity && star < 5).map(
        (starLevel) => ({
          starLevel,
        }),
      ),
      ...UE_LEVELS.map((ueLevel) => ({
        ueLevel,
      })),
    ]);

    picks.push({
      student,
      ...progress,
    });
  }

  return picks;
}

export function RostersSignedOut() {
  const t = useTranslations();
  const { students } = useStudents();

  // Picked after mount: a random pick during render wouldn't match the
  // server's HTML.
  const [examples, setExamples] = useState<ExampleStudent[]>([]);

  useEffect(() => {
    setExamples(pickExampleStudents(students));
  }, [
    students,
  ]);

  return (
    <SignedOutToolView
      title={t("tools.roster.signedOut.title")}
      description={t("tools.roster.signedOut.description")}
      features={[
        t("tools.roster.signedOut.featureProgress"),
        t("tools.roster.signedOut.featureBorrow"),
        t("tools.roster.signedOut.featureShare"),
        t("tools.roster.signedOut.featureImport"),
      ]}
      example={
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-semibold">
              {t("tools.roster.signedOut.exampleName")}
            </div>

            <div className="text-sm text-muted-foreground">
              {GAME_SERVER_NAMES.NA} /{" "}
              <strong className="font-nexon-football-gothic">ARONAAAA</strong>
            </div>
          </div>

          <div className="grid min-h-[192px] grid-cols-3 justify-items-center gap-x-2 gap-y-4">
            {examples.map(({ student, starLevel, ueLevel }) => (
              <StudentCard
                key={student.id}
                student={student}
                level={EXAMPLE_LEVEL}
                starLevel={starLevel}
                ueLevel={ueLevel}
              />
            ))}
          </div>
        </div>
      }
    />
  );
}
