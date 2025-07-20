import { OwnTimelineBrowser } from "@/app/user/timelines/_components/own-timeline-browser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "My Timelines - Joe's Blue Archive Tools",
  description: "View your timelines saved in the cloud.",
  twitter: {
    card: "summary",
  },
};

export default async function MyTimelinesPage() {
  const allStudents = await db.student.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">My Timelines</h1>
          <Button asChild>
            <Link href="/timeline-visualizer">Create New Timeline</Link>
          </Button>
        </div>
        <p>Here you can view and manage your saved timelines.</p>
      </div>

      <Separator />

      <OwnTimelineBrowser allStudents={allStudents} />
    </div>
  );
}
