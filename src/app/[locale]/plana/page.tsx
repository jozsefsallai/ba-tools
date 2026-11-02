import checkMobile from "ismobilejs";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { Plana } from "@/components/plana";
import { redirect } from "@/i18n/navigation";
import { getCardMetadata } from "@/lib/og-metadata.server";

export async function generateMetadata() {
  return getCardMetadata("plana", await getLocale());
}

export default async function PlanaPage() {
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent");

  const isMobile = userAgent && checkMobile(userAgent).any;

  if (!isMobile) {
    return redirect({
      href: "/",
      locale: await getLocale(),
    });
  }

  return <Plana centered />;
}
