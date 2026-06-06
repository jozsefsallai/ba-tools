"use client";

import { PlanaChatAvatar } from "@/app/plana-ai/_components/plana-chat-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function ChatErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex w-full gap-3">
      <PlanaChatAvatar className="mt-1" />

      <div
        className={cn(
          "max-w-[82%] rounded-2xl rounded-bl-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm md:max-w-[70%] dark:border-destructive/60 dark:bg-destructive/20",
        )}
      >
        <p>{message}</p>
        <Button
          className="mt-3"
          onClick={onRetry}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCwIcon />
          {t("tools.plana.errors.retry")}
        </Button>
      </div>
    </div>
  );
}
