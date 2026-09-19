import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.recruitment.title")} - ${t("common.appName")}`,
    description: t("tools.recruitment.description"),
  };
}

export default async function RecruitmentLayout({
  children,
}: PropsWithChildren) {
  await auth.protect();
  return children;
}
