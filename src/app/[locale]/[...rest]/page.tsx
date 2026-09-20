import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: `${t("common.notFound.code")} - ${t("common.notFound.title")} - ${t("common.appName")}`,
    description: t("common.notFound.description"),
  };
}

export default function CatchAllPage() {
  notFound();
}
