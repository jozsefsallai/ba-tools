"use client";

import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import Link from "next/link";

export function UserCorner() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl">User Corner</h2>

      <Unauthenticated>
        <>
          <p>
            Create an account to save your preferences and data to the cloud.
            With an account, you can save and access various things you create
            on the site (e.g. timelines and formations) from any device. You can
            also share your timelines with other people.
          </p>

          <div>
            <Button asChild>
              <SignInButton mode="modal" oauthFlow="popup" />
            </Button>
          </div>
        </>
      </Unauthenticated>

      <Authenticated>
        <nav className="flex flex-col gap-4">
          <Button variant="outline" asChild>
            <Link href="/user/formations">My Formations</Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/user/timelines">My Timelines</Link>
          </Button>
        </nav>
      </Authenticated>
    </section>
  );
}
