import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import Link from "next/link";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: "My Timelines - Joe's Blue Archive Tools",
  description: "View your timelines saved in the cloud.",
  twitter: {
    card: "summary",
  },
};

export default async function MyTimelinesHomeLayout({
  children,
}: PropsWithChildren) {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">My Timelines</h1>

          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Link href="/user/timelines/new-group">New Group</Link>
            </Button>

            <Button asChild>
              <Link href="/timeline-visualizer">New Timeline</Link>
            </Button>
          </div>
        </div>
        <p>Here you can view and manage your saved timelines.</p>
      </div>

      <Separator />

      {children}
    </div>
  );
}
