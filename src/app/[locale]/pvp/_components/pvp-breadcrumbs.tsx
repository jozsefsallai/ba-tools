"use client";

import { BreadcrumbScope } from "@/components/providers/breadcrumbs-provider";
import { usePathname } from "@/i18n/navigation";
import { buildPvpBreadcrumbs } from "@/lib/pvp/breadcrumbs";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";

export function PVPBreadcrumbs({
  children,
  seasonName,
  opponentName,
}: PropsWithChildren<{
  seasonName?: string | null;
  opponentName?: string | null;
}>) {
  const t = useTranslations();
  const pathname = usePathname();

  const items = buildPvpBreadcrumbs(pathname, t, {
    seasonName: seasonName ?? null,
    opponentName: opponentName ?? null,
  });

  return items ? (
    <BreadcrumbScope items={items}>{children}</BreadcrumbScope>
  ) : (
    children
  );
}
