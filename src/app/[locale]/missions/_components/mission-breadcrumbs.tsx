"use client";

import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { BreadcrumbScope } from "@/components/providers/breadcrumbs-provider";

export function MissionBreadcrumbs({
  label,
  children,
}: PropsWithChildren<{
  label: string;
}>) {
  const t = useTranslations();

  return (
    <BreadcrumbScope
      items={[
        {
          label: t("common.header.nav.resouces.title"),
          href: "/",
        },
        {
          label: t("common.header.nav.resouces.missions"),
          href: "/missions",
        },
        {
          label,
        },
      ]}
    >
      {children}
    </BreadcrumbScope>
  );
}
