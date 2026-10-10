import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata() {
  return getCardMetadata("rest", await getLocale());
}

export default function CatchAllPage() {
  notFound();
}
