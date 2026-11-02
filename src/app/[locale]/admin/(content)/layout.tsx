import { currentUser } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { redirect } from "@/i18n/navigation";
import { canManageContent } from "@/lib/auth/roles";

export default async function AdminContentLayout({
  children,
}: PropsWithChildren) {
  const user = await currentUser();

  if (!canManageContent(user)) {
    redirect({
      href: "/",
      locale: await getLocale(),
    });
  }

  return children;
}
