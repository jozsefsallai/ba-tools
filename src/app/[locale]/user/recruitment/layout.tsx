import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";

export async function generateMetadata() {
  return getCardMetadata("user-recruitment", await getLocale());
}

export default async function RecruitmentLayout({
  children,
}: PropsWithChildren) {
  await auth.protect();
  return children;
}
