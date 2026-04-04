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
    <footer className="border-t px-4 py-8 text-muted-foreground text-center text-sm">
      <div>
          {t.rich("common.footer.copyright", {
            a: (children) => (
              <a
                href="https://joexyz.online"
                target="_blank"
                rel="noreferrer noopener"
                className="underline"
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
    </footer>
  );
}
