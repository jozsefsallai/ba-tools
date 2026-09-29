import { PVPPageClient } from "@/app/[locale]/pvp/_components/pvp-page-client";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.title")} - ${t("common.appName")}`,
    description: t("tools.pvp.description"),
    twitter: {
      card: "summary",
    },
  };
}

export default async function PVPPage() {
  return <PVPPageClient />;
}
