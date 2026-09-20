import type { Id } from "~convex/dataModel";

const PLANA_AI_PATH = "/plana-ai";

export function getPlanaChatIdFromPath(pathname: string) {
  const match = pathname.match(/^\/plana-ai\/([^/]+)$/);

  if (!match?.[1]) {
    return undefined;
  }

  return match[1] as Id<"planaChat">;
}

export function getPlanaChatPath(chatId?: Id<"planaChat">) {
  return chatId ? `${PLANA_AI_PATH}/${chatId}` : PLANA_AI_PATH;
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
