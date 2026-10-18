import { redirect } from "@/i18n/navigation";
import { canManageContent } from "@/lib/auth/roles";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { currentUser } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";

export async function generateMetadata() {
  return getCardMetadata("admin", await getLocale());
}

// Baseline guard: only staff (super users or maintainers) may enter /admin at
// all. Pages must live in a route group with a stricter guard:
// - (content): manageable by maintainers and super users
// - (super-user): super users only
export default async function AdminLayout({ children }: PropsWithChildren) {
  const user = await currentUser();

  if (!canManageContent(user)) {
    redirect({ href: "/", locale: await getLocale() });
  }

  return children;
}
