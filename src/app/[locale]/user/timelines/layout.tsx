import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";

export async function generateMetadata() {
  return getCardMetadata("user-timelines", await getLocale());
}

export default async function MyTimelinesLayout({
  children,
}: PropsWithChildren) {
  await auth.protect();
  return children;
}
