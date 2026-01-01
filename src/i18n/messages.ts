import { DEFAULT_LOCALE } from "@/i18n/constants";
import deepmerge from "deepmerge";
import type {
  LocaleNamespace,
  LocaleNamespaceKey,
  Messages,
} from "@/i18n/types";

export async function importLocaleNamespace<T extends LocaleNamespaceKey>(
  locale: string,
  namespace: T,
): Promise<LocaleNamespace<T>> {
  return (await import(`./translations/${locale}/${namespace}.json`)).default;
}

export async function getMessagesForLocale(locale: string): Promise<Messages> {
  const localeMessages: Messages = {
    common: await importLocaleNamespace(locale, "common"),
    static: await importLocaleNamespace(locale, "static"),
    tools: await importLocaleNamespace(locale, "tools"),
  };

  if (locale === DEFAULT_LOCALE) {
    return localeMessages;
  }

  const defaultLocaleMessages = await getMessagesForLocale(DEFAULT_LOCALE);

  return deepmerge(defaultLocaleMessages, localeMessages);
}
