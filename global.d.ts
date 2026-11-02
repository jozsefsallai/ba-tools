import type { SupportedLocale } from "./src/i18n/constants";
import type { Messages } from "./src/i18n/types";

declare module "next-intl" {
  interface AppConfig {
    Locale: SupportedLocale;
    Messages: Messages;
  }
}
