"use client";

import { useActivePlanaChat } from "@/app/plana-ai/_components/plana-chat-layout";
import { PlanaChatSidebar } from "@/app/plana-ai/_components/plana-chat-sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";

export function PlanaMobileChatSidebar({ children }: PropsWithChildren) {
  const t = useTranslations();
  const { activeChatId } = useActivePlanaChat();

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>

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
  );
}
