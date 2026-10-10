import { PVPMatchEditor } from "@/app/[locale]/pvp/_components/pvp-match-editor";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata("pvp-seasonId-match-new", await getLocale());
}

export default async function NewPVPMatchPage({
  params,
}: {
  params: Promise<{ seasonId: Id<"pvpSeason"> }>;
}) {
  await auth.protect();
  const { seasonId } = await params;
  return <PVPMatchEditor seasonId={seasonId} />;
}
