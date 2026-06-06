"use client";

import planaIcon from "@/assets/plana-icon.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

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
      <Avatar className="mt-1 size-8 border bg-background">
        <Image
          alt="Plana"
          className="size-full object-cover"
          placeholder="blur"
          src={planaIcon}
        />
        <AvatarFallback className="text-xs">P</AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[82%] rounded-2xl rounded-bl-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive shadow-sm md:max-w-[70%]",
        )}
      >
        <p>{message}</p>
        <Button
          className="mt-3 border-destructive/30 bg-background/80 text-destructive hover:bg-destructive/15 hover:text-destructive"
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
