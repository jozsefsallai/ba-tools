import { redirect } from "@/i18n/navigation";
import { isSuperUser } from "@/lib/auth/super-user";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { currentUser } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";

export async function generateMetadata() {
  return getCardMetadata("admin", await getLocale());
}

export default async function AdminLayout({ children }: PropsWithChildren) {
  const user = await currentUser();

  if (!isSuperUser(user)) {
    redirect({ href: "/", locale: await getLocale() });
  }

  return children;
}
