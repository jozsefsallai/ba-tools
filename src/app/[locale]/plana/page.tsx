import type { Metadata } from "next";

import { headers } from "next/headers";
import checkMobile from "ismobilejs";

import { Plana } from "@/components/plana";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Plana Headpat Room - Joe's Blue Archive Tools",
  description: "Stare at Plana and headpat her.",
  twitter: {
    card: "summary",
  },
};

export default async function PlanaPage() {
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent");

  const isMobile = userAgent && checkMobile(userAgent).any;

  if (!isMobile) {
    return redirect({ href: "/", locale: await getLocale() });
  }

  return <Plana centered />;
}
