"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TheFooter({
  commitHash,
}: {
  commitHash: string;
}) {
  const pathname = usePathname();

  if (pathname === "/plana") {
    return;
  }

  return (
    <footer className="border-t px-2 py-8 bg-background text-muted-foreground text-center text-sm relative z-10">
      <div className="container">
        <div className="md:w-2/3 mx-auto">
          Made by{" "}
          <a
            href="https://joexyz.online"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            joexyz
          </a>
          . This website is in no way affiliated or endorsed by NEXON Games Co.,
          Ltd. or Yostar, Inc.
          <br />
          <a
            href="https://nimblebun.works/en/terms"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            Terms
          </a>{" "}
          &middot;{" "}
          <a
            href="https://nimblebun.works/en/privacy"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            Privacy
          </a>{" "}
          &middot;{" "}
          <Link href="/credits" className="underline">
            Credits
          </Link>{" "}
          &middot;{" "}
          <a
            href="https://github.com/jozsefsallai/ba-tools"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            Source code
          </a>{" "}
          &middot;{" "}
          {commitHash === "development"
            ? "development"
            : commitHash.slice(0, 7)}
        </div>
      </div>
    </footer>
  );
}
