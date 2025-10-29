import { PVPMatchEditor } from "@/app/pvp/_components/pvp-match-editor";
import type { Metadata } from "next";
import type { Id } from "~convex/dataModel";

export const metadata: Metadata = {
  title: "New PVP Match - Joe's Blue Archive Tools",
  description: "Create a PVP matches.",
  twitter: {
    card: "summary",
  },
};

export default async function NewPVPMatchPage({
  params,
}: {
  params: Promise<{ seasonId: Id<"pvpSeason"> }>;
}) {
  const { seasonId } = await params;
  return <PVPMatchEditor seasonId={seasonId} />;
}
