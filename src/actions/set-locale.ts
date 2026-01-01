"use server";

import { LOCALE_COOKIE_KEY, type SupportedLocale } from "@/i18n/constants";
import { cookies } from "next/headers";

export async function setLocale(locale: SupportedLocale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_KEY, locale);
}
