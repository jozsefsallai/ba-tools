import { isSuperUser } from "@/lib/auth/super-user";
import { currentUser } from "@clerk/nextjs/server";
import type { PropsWithChildren } from "react";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function AdminLayout({ children }: PropsWithChildren) {
  const user = await currentUser();

  if (!isSuperUser(user)) {
    redirect({ href: "/", locale: await getLocale() });
  }

  return children;
}
