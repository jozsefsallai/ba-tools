"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Authenticated } from "convex/react";
import Link from "next/link";

export function UserCorner() {
  return (
    <Authenticated>
      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">User Corner</h2>

        <nav className="flex gap-4">
          <Button asChild>
            <Link href="/user/timelines">My Timelines</Link>
          </Button>
        </nav>
      </section>
    </Authenticated>
  );
}
