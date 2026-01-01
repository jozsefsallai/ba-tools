import type { Metadata } from "next";
import { headers } from "next/headers";

import { Plana } from "@/components/plana";

import checkMobile from "ismobilejs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserCorner } from "@/app/(home)/_components/user-corner";
import { ToolsAndResources } from "@/app/(home)/_components/tools-and-resources";
import { DonationBox } from "@/app/(home)/_components/donation-box";
import { ChangelogItem } from "@/components/common/changelog-item";
import { CHANGELOG } from "@/changelog";
import { Separator } from "@/components/ui/separator";
import { getTranslations } from "next-intl/server";

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

  const t = await getTranslations();

  return (
    <article className="flex flex-col gap-4 md:w-2/3 mx-auto">
      <h1 className="text-4xl">{t("static.home.welcome")}</h1>

      <p>
        {t.rich("static.home.intro1", {
          strong: (children) => <strong>{children}</strong>,
        })}
      </p>

      <p>
        {t.rich("static.home.intro2", {
          a1: (children) => (
            <strong>
              <a
                href="discord://open/users/245890903133257730"
                className="underline"
              >
                {children}
              </a>
            </strong>
          ),
          a2: (children) => (
            <a
              href="https://github.com/jozsefsallai/ba-tools"
              target="_blank"
              rel="noreferrer noopener"
              className="underline"
            >
              {children}
            </a>
          ),
        })}
      </p>

      {!isMobile && <Plana />}

      {isMobile && (
        <Button variant="outline" asChild>
          <Link href="/plana">{t("static.home.planaPat")}</Link>
        </Button>
      )}

      <ToolsAndResources />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UserCorner />
        <DonationBox />
      </div>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">{t("static.home.changelog.title")}</h2>

        <ChangelogItem data={CHANGELOG[0]} />

        <Button variant="outline" asChild>
          <Link href="/changelog">{t("static.home.changelog.viewAll")}</Link>
        </Button>
      </section>
    </article>
  );
}
