import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { PVPStatsSearch } from "@/app/[locale]/pvp/_components/pvp-stats-search";
import { getCardMetadata } from "@/lib/og-metadata.server";

export async function generateMetadata() {
  return getCardMetadata("pvp-search", await getLocale());
}

export default function PVPStatsSearchPage() {
  return (
    <Suspense fallback={null}>
      <PVPStatsSearch />
    </Suspense>
  );
}
