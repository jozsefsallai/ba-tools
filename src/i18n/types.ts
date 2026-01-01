import type commonMessages from "./translations/en/common.json";
import type staticMessages from "./translations/en/static.json";
import type toolsMessages from "./translations/en/tools.json";

export type Messages = {
  common: typeof commonMessages;
  static: typeof staticMessages;
  tools: typeof toolsMessages;
};

export type LocaleNamespaceKey = keyof Messages;
export type LocaleNamespace<T extends LocaleNamespaceKey> = Messages[T];
