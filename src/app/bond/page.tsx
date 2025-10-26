import { BondView } from "@/app/bond/_components/bond-view";
import { InventoryTip } from "@/app/bond/_components/inventory-tip";
import { DirtyStateTrackerProvider } from "@/components/providers/dirty-state-tracker-provider";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { HelpCircleIcon } from "lucide-react";
import type { Metadata } from "next";
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
  const students = await db.student.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      giftsAdored: true,
      giftsLoved: true,
      giftsLiked: true,
    },
  });

  const gifts = await db.gift.findMany({
    include: {
      adoredBy: {
        orderBy: {
          name: "asc",
        },
      },
      lovedBy: {
        orderBy: {
          name: "asc",
        },
      },
      likedBy: {
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Relationship Rank Calculator</h1>
          <HelpSheet document="bond">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>

        <p>
          Using this tool you can calculate the relationship rank of a student
          based on what gifts you give to them. This tool can be useful if you
          want to plan gifts ahead or if you want to check your gift saving
          progress.
        </p>

        <InventoryTip />
      </div>

      <Suspense>
        <DirtyStateTrackerProvider loggedInOnly>
          <BondView students={students} gifts={gifts} />
        </DirtyStateTrackerProvider>
      </Suspense>
    </div>
  );
}
