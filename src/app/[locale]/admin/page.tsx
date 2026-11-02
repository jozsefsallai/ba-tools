import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function AdminPage() {
  redirect({
    href: "/admin/banners",
    locale: await getLocale(),
  });
}
