"use client";

import { PlanaChat } from "@/app/plana-ai/_components/plana-chat";
import { PlanaChatSidebar } from "@/app/plana-ai/_components/plana-chat-sidebar";
import { usePlanaChatUrl } from "@/app/plana-ai/_hooks/use-plana-chat-url";
import { cn } from "@/lib/utils";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
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

export function PlanaChatLayout({ chatId: initialChatId }: PlanaChatLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activityTimestamps, setActivityTimestamps] = useState<
    Record<string, number>
  >({});
  const { pushChatUrl, replaceChatUrl, urlChatId } =
    usePlanaChatUrl(initialChatId);
  const activeChatId = urlChatId ?? initialChatId;

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
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3 overflow-hidden md:gap-4",
          sidebarCollapsed
            ? "md:grid-cols-[3rem_minmax(0,1fr)]"
            : "md:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]",
        )}
      >
        <PlanaChatSidebar
          activeChatId={activeChatId}
          className="hidden min-w-0 md:flex"
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
