"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TheFooter({
  commitHash,
}: {
  commitHash: string;
}) {
  const pathname = usePathname();
  const t = useTranslations();

  if (pathname === "/plana") {
    return;
  }

  return (
    <footer className="border-t-4 border-[#ffff00] px-2 py-8 text-center text-sm relative z-10 bg-gradient-to-r from-[#ff00ff] via-[#00ffff] to-[#ffff00] dark:from-[#330033] dark:via-[#003366] dark:to-[#003300] text-[#000080] dark:text-[#00ff00]">
      <div className="container">
        <div className="md:w-2/3 mx-auto comic-sans space-y-2">
          <p className="blink text-[#ff0000] dark:text-[#ffff00] font-bold text-base">
            [NEW!] We got a footer now!!! [NEW!]
          </p>
          <p>
            Webmaster:{" "}
            <a
              href="mailto:hi@joexyz.online"
              className="underline text-[#0000ff] dark:text-[#ff99ff]"
            >
              email me!!!
            </a>{" "}
            ~ no spam plz ~
          </p>
          {t.rich("common.footer.copyright", {
            a: (children) => (
              <a
                href="https://joexyz.online"
                target="_blank"
                rel="noreferrer noopener"
                className="underline font-bold"
                style={{ color: "#660099" }}
              >
                {children}
              </a>
            ),
          })}
          <br />
          <a
            href="https://nimblebun.works/en/terms"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            {t("common.footer.nav.terms")}
          </a>{" "}
          &middot;{" "}
          <a
            href="https://nimblebun.works/en/privacy"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            {t("common.footer.nav.privacy")}
          </a>{" "}
          &middot;{" "}
          <Link href="/credits" className="underline">
            {t("common.footer.nav.credits")}
          </Link>{" "}
          &middot;{" "}
          <a
            href="https://github.com/jozsefsallai/ba-tools"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            {t("common.footer.nav.sourceCode")}
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
