import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import type { PropsWithChildren } from "react";

export default async function MyRostersHomeLayout({
  children,
}: PropsWithChildren) {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">My Rosters</h1>

          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/user/rosters/new">New Roster</Link>
            </Button>
          </div>
        </div>

        <p>
          Here you can view and manage your rosters which you can share
          publicly.
        </p>
      </div>

      <Separator />

      {children}
    </div>
  );
}
