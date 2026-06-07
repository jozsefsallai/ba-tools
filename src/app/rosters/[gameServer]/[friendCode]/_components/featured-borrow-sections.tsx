"use client";

import { RosterItem } from "@/app/rosters/[gameServer]/[friendCode]/_components/roster-item";
import type { RosterStudentData } from "@/app/rosters/[gameServer]/[friendCode]/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BORROW_SLOT_GAMEMODES, type BorrowSlotGameMode } from "@/lib/types";
import { useTranslations } from "next-intl";

export type FeaturedBorrowSectionsProps = {
  featuredStudents: Record<BorrowSlotGameMode, RosterStudentData[]>;
};

export function FeaturedBorrowSections({
  featuredStudents,
}: FeaturedBorrowSectionsProps) {
  const t = useTranslations("tools.roster.view.featuredBorrow");

  const modesWithStudents = BORROW_SLOT_GAMEMODES.filter(
    (mode) => featuredStudents[mode].length > 0,
  );

  if (modesWithStudents.length === 0) {
    return null;
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 3xl:grid-cols-4">
      {modesWithStudents.map((mode) => (
        <Card key={mode} className="min-w-0">
          <CardHeader className="px-4 pb-2 sm:px-6">
            <CardTitle className="text-sm leading-snug break-words sm:text-base">
              {t(`modes.${mode}`)}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-3 px-4 sm:px-6">
            {featuredStudents[mode].map((item) => (
              <RosterItem key={item.studentId} item={item} featured />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
