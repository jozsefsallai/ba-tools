"use client";

import { BreadcrumbScope } from "@/components/providers/breadcrumbs-provider";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";

export function StudentBreadcrumbs({
  name,
  iconUrl,
  children,
}: PropsWithChildren<{ name: string; iconUrl: string }>) {
  const t = useTranslations();

  return (
    <BreadcrumbScope
      items={[
        { label: t("common.header.nav.resouces.title"), href: "/" },
        { label: t("common.header.nav.resouces.students"), href: "/students" },
        { label: name, icon: iconUrl },
      ]}
    >
      {children}
    </BreadcrumbScope>
  );
}
