import { AdminRoadmapView } from "@/app/[locale]/admin/roadmap/_components/admin-roadmap-view";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { fetchRoadmapItems } from "@/lib/roadmap/roadmap.server";
import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("admin-roadmap", await getLocale());
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminRoadmapPage() {
  const items = await fetchRoadmapItems();

  return <AdminRoadmapView initialItems={items} now={Date.now()} />;
}
