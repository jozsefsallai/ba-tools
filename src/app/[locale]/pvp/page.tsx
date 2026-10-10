import { PVPPageClient } from "@/app/[locale]/pvp/_components/pvp-page-client";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("pvp", await getLocale());
}

export default async function PVPPage() {
  return <PVPPageClient />;
}
