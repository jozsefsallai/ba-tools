import { PVPEffectiveTeams } from "@/app/[locale]/pvp/_components/pvp-effective-teams";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("pvp-most-effective-teams", await getLocale());
}

export default function MostEffectiveTeamsPage() {
  return <PVPEffectiveTeams />;
}
