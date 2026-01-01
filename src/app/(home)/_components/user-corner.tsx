"use client";

import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function UserCorner() {
  const t = useTranslations();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl">{t("static.home.userCorner.title")}</h2>

      <Unauthenticated>
        <>
          <p>{t("static.home.userCorner.description")}</p>

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
            <Link href="/user/formations">
              {t("static.home.userCorner.nav.formations")}
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/user/timelines">
              {t("static.home.userCorner.nav.timelines")}
            </Link>
          </Button>
        </nav>
      </Authenticated>
    </section>
  );
}
