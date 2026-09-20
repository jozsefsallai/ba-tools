import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ locale: string; id: string }>;
  },
) {
  const { locale, id } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return redirect({
      href: `/timelines/${id}`,
      locale: routing.defaultLocale,
    });
  }

  return redirect({ href: `/timelines/${id}`, locale });
}
