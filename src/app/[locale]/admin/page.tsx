import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function AdminPage() {
  redirect({ href: "/admin/banners", locale: await getLocale() });
}
