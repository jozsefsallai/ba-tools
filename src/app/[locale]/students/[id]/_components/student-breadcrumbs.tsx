"use client";

import type { PropsWithChildren } from "react";
import { useTranslations } from "next-intl";

import { useStudentListLink } from "@/app/[locale]/students/_lib/student-list-state";
import { BreadcrumbScope } from "@/components/providers/breadcrumbs-provider";

export function StudentBreadcrumbs({
  name,
  iconUrl,
  children,
}: PropsWithChildren<{ name: string; iconUrl: string }>) {
  const t = useTranslations();
  const studentListLink = useStudentListLink();

  return (
    <BreadcrumbScope
      items={[
        { label: t("common.header.nav.resouces.title"), href: "/" },
        {
          label: t("common.header.nav.resouces.students"),
          ...studentListLink,
        },
        { label: name, icon: iconUrl },
      ]}
    >
      {children}
    </BreadcrumbScope>
  );
}
