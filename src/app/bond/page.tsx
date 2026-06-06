import {
  BondView,
  type GiftWithStudents,
  type StudentWithGifts,
} from "@/app/bond/_components/bond-view";
import { InventoryTip } from "@/app/bond/_components/inventory-tip";
import { DirtyStateTrackerProvider } from "@/components/providers/dirty-state-tracker-provider";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Gift, Student } from "@/lib/db/client";
import { HelpCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Relationship Rank Calculator - Joe's Blue Archive Tools",
  description:
    "Calculate the relationship rank of a student based on what gifts you give to them.",
  twitter: {
    card: "summary",
  },
};

export default async function BondPage() {
  const t = await getTranslations();

  const students = await db.student.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      giftsAdored: {
        select: {
          id: true,
        },
      },
      giftsLoved: {
        select: {
          id: true,
        },
      },
      giftsLiked: {
        select: {
          id: true,
        },
      },
    },
  });

  const gifts = await db.gift.findMany({
    include: {
      adoredBy: {
        select: {
          id: true,
        },
      },
      lovedBy: {
        select: {
          id: true,
        },
      },
      likedBy: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const studentMap = new Map<string, Student>();
  const giftMap = new Map<number, Gift>();

  for (const student of students) {
    studentMap.set(student.id, student);
  }

  for (const gift of gifts) {
    giftMap.set(gift.id, gift);
  }

  const studentsWithGifts: StudentWithGifts[] = [];
  const giftsWithStudents: GiftWithStudents[] = [];

  for (const student of students) {
    const giftsAdored = student.giftsAdored
      .map((gift) => giftMap.get(gift.id))
      .filter((gift): gift is Gift => !!gift);
    const giftsLoved = student.giftsLoved
      .map((gift) => giftMap.get(gift.id))
      .filter((gift): gift is Gift => !!gift);
    const giftsLiked = student.giftsLiked
      .map((gift) => giftMap.get(gift.id))
      .filter((gift): gift is Gift => !!gift);

    studentsWithGifts.push({
      ...student,
      giftsAdored,
      giftsLoved,
      giftsLiked,
    });
  }

  for (const gift of gifts) {
    const adoredBy = gift.adoredBy
      .map((student) => studentMap.get(student.id))
      .filter((student): student is Student => !!student);
    const lovedBy = gift.lovedBy
      .map((student) => studentMap.get(student.id))
      .filter((student): student is Student => !!student);
    const likedBy = gift.likedBy
      .map((student) => studentMap.get(student.id))
      .filter((student): student is Student => !!student);

    giftsWithStudents.push({
      ...gift,
      adoredBy,
      lovedBy,
      likedBy,
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("tools.bond.title")}</h1>
          <HelpSheet document="bond">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>

        <p>{t("tools.bond.description")}</p>

        <InventoryTip />
      </div>

      <Suspense>
        <DirtyStateTrackerProvider loggedInOnly>
          <BondView students={studentsWithGifts} gifts={giftsWithStudents} />
        </DirtyStateTrackerProvider>
      </Suspense>
    </div>
  );
}
