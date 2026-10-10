import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";

import { LocaleNotFoundView } from "@/app/[locale]/_components/locale-not-found-view";

export async function generateMetadata() {
  return getCardMetadata("not-found", await getLocale());
}

export default function NotFound() {
  return <LocaleNotFoundView />;
}
