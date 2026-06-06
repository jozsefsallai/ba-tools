"use client";

import { PlanaChatLayout } from "@/app/plana-ai/_components/plana-chat-layout";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import type { Id } from "~convex/dataModel";

type PlanaAiViewProps = {
  chatId?: Id<"planaChat">;
};

export function PlanaAiView({ chatId }: PlanaAiViewProps) {
  const { isLoaded, isSignedIn } = useUser();
  const t = useTranslations();

  if (!isLoaded) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (!isSignedIn) {
    return (
      <MessageBox className="flex flex-col gap-6">
        <div>{t("tools.plana.needAccount")}</div>
        <div>
          <Button asChild>
            <SignInButton mode="modal" oauthFlow="popup" />
          </Button>
        </div>
      </MessageBox>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PlanaChatLayout chatId={chatId} />
    </div>
  );
}
