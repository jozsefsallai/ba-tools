import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_KEY,
  type SupportedLocale,
} from "@/i18n/constants";
import { getMessagesForLocale } from "@/i18n/messages";
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE_KEY)?.value || DEFAULT_LOCALE;

  const messages = await getMessagesForLocale(locale);

  return {
    locale: locale as SupportedLocale,
    messages,
  };
});
