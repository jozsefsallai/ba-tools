"use client";

import { useTranslations } from "next-intl";
import { type PropsWithChildren, useState } from "react";
import { useActivePlanaChat } from "@/app/[locale]/plana-ai/_components/plana-chat-layout";
import { PlanaChatSidebar } from "@/app/[locale]/plana-ai/_components/plana-chat-sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function PlanaMobileChatSidebar({ children }: PropsWithChildren) {
  const t = useTranslations();
  const { activeChatId } = useActivePlanaChat();
  const [open, setOpen] = useState(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        className="flex w-[min(100vw-2rem,320px)] flex-col gap-0 p-0"
        side="left"
      >
        <SheetHeader className="border-b p-4">
          <SheetTitle>{t("tools.plana.sidebar.title")}</SheetTitle>
        </SheetHeader>
        <PlanaChatSidebar
          activeChatId={activeChatId}
          className="min-h-0 flex-1"
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
