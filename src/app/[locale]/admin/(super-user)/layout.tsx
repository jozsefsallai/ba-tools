import { currentUser } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { redirect } from "@/i18n/navigation";
import { isSuperUser } from "@/lib/auth/roles";

export default async function AdminSuperUserLayout({
  children,
}: PropsWithChildren) {
  const user = await currentUser();

  if (!isSuperUser(user)) {
    redirect({
      href: "/",
      locale: await getLocale(),
    });
  }

  return children;
}
