"use client";

import { PlanaChat } from "@/app/plana-ai/_components/plana-chat";
import { PlanaChatSidebar } from "@/app/plana-ai/_components/plana-chat-sidebar";
import { usePlanaChatUrl } from "@/app/plana-ai/_hooks/use-plana-chat-url";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PanelLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
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
          "grid h-[calc(100dvh-8rem)] min-h-0 gap-3 overflow-hidden md:gap-4",
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

        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon-sm" type="button" variant="outline">
                  <PanelLeftIcon />
                  <span className="sr-only">
                    {t("tools.plana.sidebar.open")}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent
                className="w-[min(100vw-2rem,320px)] p-0"
                side="left"
              >
                <SheetHeader className="border-b p-4">
                  <SheetTitle>{t("tools.plana.sidebar.title")}</SheetTitle>
                </SheetHeader>
                <PlanaChatSidebar
                  activeChatId={activeChatId}
                  className="h-full rounded-none border-0 shadow-none"
                />
              </SheetContent>
            </Sheet>
          </div>

          <PlanaChat chatId={activeChatId} />
        </div>
      </div>
    </ActivePlanaChatContext.Provider>
  );
}
