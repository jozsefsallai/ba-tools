"use client";

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
    <footer className="border-t px-2 py-12 bg-background text-muted-foreground text-center text-sm relative z-10">
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
          . Blue Archive, as well as the graphic assets displayed on this
          website are the property of NEXON Games Co., Ltd. and Yostar, Inc.
          This website is in no way affiliated or endorsed by the previously
          mentioned companies.
          <br />
          The font "NEXON Football Gothic" used in certain places on the website
          belongs to NEXON Korea.
          <br />
          <a
            href="https://github.com/jozsefsallai/ba-tools"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            Source code
          </a>{" "}
          -{" "}
          {commitHash === "development"
            ? "development"
            : commitHash.slice(0, 7)}
        </div>
      </div>
    </footer>
  );
}
