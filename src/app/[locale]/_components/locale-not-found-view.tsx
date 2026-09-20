"use client";

import { NotFoundView } from "@/components/common/not-found-view";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function LocaleNotFoundView() {
  const t = useTranslations();

  return (
    <NotFoundView
      LinkComponent={Link}
      code={t("common.notFound.code")}
      description={t("common.notFound.description")}
      homeLabel={t("common.notFound.home")}
      quote={t("common.notFound.quote")}
      title={t("common.notFound.title")}
    />
  );
}
