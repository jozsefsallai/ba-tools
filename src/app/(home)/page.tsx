import type { Metadata } from "next";
import { headers } from "next/headers";

import { Plana } from "@/components/plana";

import checkMobile from "ismobilejs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserCorner } from "@/app/(home)/_components/user-corner";

export const metadata: Metadata = {
  title: "Joe's Blue Archive Tools",
  description: "Various tools and utilities for Blue Archive",
  twitter: {
    card: "summary",
  },
};

export default async function Home() {
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent");

  const isMobile = userAgent && checkMobile(userAgent).any;

  return (
    <article className="flex flex-col gap-4 md:w-2/3 mx-auto">
      <h1 className="text-4xl">Welcome!</h1>

      <p>
        This is a collection of tools and utilities that I've created for
        players of the mobile game <strong>Blue Archive</strong>.
      </p>

      <p>
        The tools I'm putting on here are mostly things that I'll be using for
        my own needs, but I decided to make them available for everyone in case
        they find any of them useful.
      </p>

      <p>
        If you have any suggestions or feedback, feel free to reach out to me on
        Discord: <strong>joexyz</strong>.
      </p>

      <p>
        The source code is also available on{" "}
        <a
          href="https://github.com/jozsefsallai/ba-tools"
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          GitHub
        </a>
        .
      </p>

      {!isMobile && <Plana />}

      {isMobile && (
        <Button variant="outline" asChild>
          <Link href="/plana">Ok, I just wanna headpat Plana</Link>
        </Button>
      )}

      <UserCorner />
    </article>
  );
}
