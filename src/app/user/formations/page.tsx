import { FormationsBrowser } from "@/app/user/formations/_components/formations-browser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "My Formations - Joe's Blue Archive Tools",
  description: "View and manage your formations saved in the cloud.",
  twitter: {
    card: "summary",
  },
};

export default async function MyFormationsPage() {
  const allStudents = await db.student.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">My Formations</h1>
          <Button asChild>
            <Link href="/formation-display">Create New Formation</Link>
          </Button>
        </div>
        <p>Here you can view and manage your saved formations.</p>
      </div>

      <Separator />

      <FormationsBrowser allStudents={allStudents} />
    </div>
  );
}
