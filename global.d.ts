import type { Messages } from "./src/i18n/types";
import type { SupportedLocale } from "./src/i18n/constants";

declare module "next-intl" {
  interface AppConfig {
    Locale: SupportedLocale;
    Messages: Messages;
  }
}
