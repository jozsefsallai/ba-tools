import type { Id } from "~convex/dataModel";

const PLANA_AI_PATH = "/plana-ai";

// The default locale has no prefix (`/plana-ai`), others do (`/ja/plana-ai`).
const CHAT_PATH_REGEX = /^(\/[a-z]{2})?\/plana-ai(?:\/([^/]+))?\/?$/;

export function getPlanaChatIdFromPath(pathname: string) {
  return pathname.match(CHAT_PATH_REGEX)?.[2] as Id<"planaChat"> | undefined;
}

export function getPlanaChatPath(chatId?: Id<"planaChat">) {
  const localePrefix =
    window.location.pathname.match(CHAT_PATH_REGEX)?.[1] ?? "";

  const path = `${localePrefix}${PLANA_AI_PATH}`;

  return chatId ? `${path}/${chatId}` : path;
}

export function replacePlanaChatPath(chatId?: Id<"planaChat">) {
  const path = getPlanaChatPath(chatId);
  window.history.replaceState(window.history.state, "", path);
  return path;
}

export function pushPlanaChatPath(chatId?: Id<"planaChat">) {
  const path = getPlanaChatPath(chatId);
  window.history.pushState(window.history.state, "", path);
  return path;
}
