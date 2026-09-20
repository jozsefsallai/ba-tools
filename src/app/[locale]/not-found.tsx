import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LocaleNotFoundView } from "@/app/[locale]/_components/locale-not-found-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: `${t("common.notFound.code")} - ${t("common.notFound.title")} - ${t("common.appName")}`,
    description: t("common.notFound.description"),
  };
}

export default function NotFound() {
  return <LocaleNotFoundView />;
}
