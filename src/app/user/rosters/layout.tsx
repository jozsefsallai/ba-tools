import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.roster.myRosters.title")} - ${t("common.appName")}`,
    description: t("tools.roster.myRosters.pageDescription"),
    twitter: {
      card: "summary",
    },
  };
}

export default async function MyRostersLayout({ children }: PropsWithChildren) {
  return children;
}
