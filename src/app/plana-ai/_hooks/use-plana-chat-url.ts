"use client";

import {
  getPlanaChatIdFromPath,
  pushPlanaChatPath,
  replacePlanaChatPath,
} from "@/app/plana-ai/_lib/chat-url";
import { useCallback, useEffect, useState } from "react";
import type { Id } from "~convex/dataModel";

export function usePlanaChatUrl(initialChatId?: Id<"planaChat">) {
  const [urlChatId, setUrlChatId] = useState<Id<"planaChat"> | undefined>(
    initialChatId,
  );

  useEffect(() => {
    setUrlChatId(initialChatId);
  }, [initialChatId]);

  useEffect(() => {
    function syncFromPathname() {
      setUrlChatId(getPlanaChatIdFromPath(window.location.pathname));
    }

    syncFromPathname();
    window.addEventListener("popstate", syncFromPathname);

    return () => {
      window.removeEventListener("popstate", syncFromPathname);
    };
  }, []);

  const replaceChatUrl = useCallback((chatId?: Id<"planaChat">) => {
    replacePlanaChatPath(chatId);
    setUrlChatId(chatId);
  }, []);

  const pushChatUrl = useCallback((chatId?: Id<"planaChat">) => {
    pushPlanaChatPath(chatId);
    setUrlChatId(chatId);
  }, []);

  return {
    pushChatUrl,
    replaceChatUrl,
    urlChatId,
  };
}
