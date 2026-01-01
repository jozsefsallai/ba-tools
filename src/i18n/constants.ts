export const SUPPORTED_LOCALES = ["en", "jp"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_COOKIE_KEY = "_ba_tools__locale";
