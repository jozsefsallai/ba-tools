import type { Metadata } from "next";
import { headers } from "next/headers";

import { Plana } from "@/components/plana";

import { DonationBox } from "@/app/(home)/_components/donation-box";
import { Guestbook } from "@/app/(home)/_components/guestbook";
import { ResetInfo } from "@/app/(home)/_components/reset-info";
import { StudentOfTheDay } from "@/app/(home)/_components/student-of-the-day";
import { ToolsAndResources } from "@/app/(home)/_components/tools-and-resources";
import { UserCorner } from "@/app/(home)/_components/user-corner";
import { VisitorCounter } from "@/app/(home)/_components/visitor-counter";
import { CHANGELOG } from "@/changelog";
import { ChangelogItem } from "@/components/common/changelog-item";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  buildRequestFingerprint,
  computeVisitorCount,
} from "@/lib/visitor-counter";
import checkMobile from "ismobilejs";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

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

  const fingerprint = buildRequestFingerprint(headerStore);
  const visitorCount = computeVisitorCount(new Date(), fingerprint);

  const welcome = t("static.home.welcome");

  return (
    <article className="flex flex-col gap-4 md:w-2/3 mx-auto">
      <div className="marquee-container border-4 border-[#ff00ff] bg-[#ffff00] py-2 shadow-md">
        <div className="overflow-hidden whitespace-nowrap">
          <span className="inline-block marquee-scroll font-heading text-3xl md:text-4xl text-[#ff00ff] neon-glow px-4">
            {welcome}
            {" ★ ".repeat(12)}
          </span>
        </div>
      </div>

      <p className="blink text-center text-xl md:text-2xl font-bold border-4 border-[#00ff00] bg-black text-[#ffff00] py-2 px-1 comic-sans">
        *** UNDER CONSTRUCTION *** PLEASE EXCUSE OUR DUST ***
      </p>

      <VisitorCounter targetCount={visitorCount} />

      <p className="text-center">
        <a
          href="#guestbook"
          className="underline blink comic-sans text-lg font-bold"
          style={{ color: "#ff00ff" }}
        >
          Sign my Guestbook!
        </a>
      </p>

      <p style={{ color: "#cc0000" }}>
        {t.rich("static.home.intro1", {
          strong: (children) => (
            <strong style={{ color: "#0000ff" }}>{children}</strong>
          ),
        })}
      </p>

      <p style={{ color: "#006600" }}>
        {t.rich("static.home.intro2", {
          a1: (children) => (
            <strong>
              <a
                href="discord://open/users/245890903133257730"
                className="underline"
                style={{ color: "#ff6600" }}
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
              style={{ color: "#990099" }}
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

      <Separator className="border-[#ff00ff] border-2" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StudentOfTheDay />
        <ResetInfo />
      </div>

      <Separator className="border-[#00ffff] border-2" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UserCorner />
        <DonationBox />
      </div>

      <Separator className="border-[#ffff00] border-2" />

      <section className="flex flex-col gap-4" id="guestbook">
        <h2 className="text-2xl rainbow-text font-heading">
          {t("static.home.guestbook.title")}
        </h2>

        <Guestbook />
      </section>

      <Separator className="border-[#ff6600] border-2" />

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl rainbow-text font-heading">
          {t("static.home.changelog.title")}
        </h2>

        <ChangelogItem data={CHANGELOG[0]} />

        <Button variant="outline" asChild>
          <Link href="/changelog">{t("static.home.changelog.viewAll")}</Link>
        </Button>
      </section>
    </article>
  );
}
