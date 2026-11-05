"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { PlanaChat } from "@/app/[locale]/plana-ai/_components/plana-chat";
import { PlanaChatSidebar } from "@/app/[locale]/plana-ai/_components/plana-chat-sidebar";
import { usePlanaChatUrl } from "@/app/[locale]/plana-ai/_hooks/use-plana-chat-url";
import { useStoredToggle } from "@/app/[locale]/plana-ai/_hooks/use-stored-toggle";
import { cn } from "@/lib/utils";
import type { Id } from "~convex/dataModel";

type PlanaChatLayoutProps = {
  chatId?: Id<"planaChat">;
};

type ActivePlanaChatContextValue = {
  activeChatId?: Id<"planaChat">;
  activityTimestamps: Record<string, number>;
  notifyChatActivity: (chatId: Id<"planaChat">) => void;
  pushChatUrl: (chatId?: Id<"planaChat">) => void;
  replaceChatUrl: (chatId?: Id<"planaChat">) => void;
};

const ActivePlanaChatContext = createContext<ActivePlanaChatContextValue>({
  activityTimestamps: {},
  notifyChatActivity: () => {},
  pushChatUrl: () => {},
  replaceChatUrl: () => {},
});

export function useActivePlanaChat() {
  return useContext(ActivePlanaChatContext);
}

export function PlanaChatLayout({
  chatId: initialChatId,
}: PlanaChatLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useStoredToggle(
    "plana-sidebar-collapsed",
    false,
  );
  const [activityTimestamps, setActivityTimestamps] = useState<
    Record<string, number>
  >({});
  const {
    pushChatUrl,
    replaceChatUrl,
    urlChatId: activeChatId,
  } = usePlanaChatUrl(initialChatId);

  const notifyChatActivity = useCallback((chatId: Id<"planaChat">) => {
    setActivityTimestamps((current) => ({
      ...current,
      [chatId]: Date.now(),
    }));
  }, []);

  const contextValue = useMemo(
    () => ({
      activeChatId,
      activityTimestamps,
      notifyChatActivity,
      pushChatUrl,
      replaceChatUrl,
    }),
    [
      activeChatId,
      activityTimestamps,
      notifyChatActivity,
      pushChatUrl,
      replaceChatUrl,
    ],
  );

  return (
    <ActivePlanaChatContext.Provider value={contextValue}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <PlanaChatSidebar
          activeChatId={activeChatId}
          className={cn(
            "hidden min-h-0 shrink-0 border-r md:flex",
            sidebarCollapsed ? "w-12" : "w-[260px]",
          )}
          collapsed={sidebarCollapsed}
          onExpand={() => setSidebarCollapsed(false)}
          onCollapse={() => setSidebarCollapsed(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PlanaChat chatId={activeChatId} className="min-h-0 flex-1" />
        </div>
      </div>
    </ActivePlanaChatContext.Provider>
  );
}
