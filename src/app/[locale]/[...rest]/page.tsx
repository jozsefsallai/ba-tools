import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getCardMetadata } from "@/lib/og-metadata.server";

export async function generateMetadata() {
  return getCardMetadata("rest", await getLocale());
}

export default function CatchAllPage() {
  notFound();
}
