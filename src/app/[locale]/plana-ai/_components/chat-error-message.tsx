"use client";

import { RefreshCwIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlanaChatAvatar } from "@/app/[locale]/plana-ai/_components/plana-chat-avatar";
import { Button } from "@/components/ui/button";

export function ChatErrorMessage({
  message,
  onOpenSettings,
  onRetry,
}: {
  message: string;
  onOpenSettings?: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex w-full gap-3">
      <PlanaChatAvatar className="mt-0.5" />

      <div className="min-w-0 flex-1 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm leading-relaxed dark:bg-destructive/15">
        <p>{message}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={onRetry} size="sm" type="button" variant="outline">
            <RefreshCwIcon />
            {t("tools.plana.errors.retry")}
          </Button>
          {onOpenSettings ? (
            <Button
              onClick={onOpenSettings}
              size="sm"
              type="button"
              variant="outline"
            >
              <SettingsIcon />
              {t("tools.plana.errors.openSettings")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
