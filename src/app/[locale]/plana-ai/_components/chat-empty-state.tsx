"use client";

import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PlanaChatAvatar } from "@/app/[locale]/plana-ai/_components/plana-chat-avatar";
import { getSenseiDisplayName } from "@/app/[locale]/plana-ai/_lib/sensei-name";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SuggestionKey = "greeting" | "banner" | "lore" | "teaParty" | "affection";

const SUGGESTION_KEYS: SuggestionKey[] = [
  "greeting",
  "banner",
  "lore",
  "teaParty",
  "affection",
];

export function ChatEmptyState({
  composer,
  hasKey,
  onOpenSettings,
  onSelectSuggestion,
}: {
  composer: ReactNode;
  hasKey: boolean | null;
  onOpenSettings: () => void;
  onSelectSuggestion: (message: string) => void;
}) {
  const t = useTranslations();
  const { user } = useUser();
  const senseiName = getSenseiDisplayName(user);
  const getGreetingSuggestion = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return t("tools.plana.emptyState.suggestions.greetingMorning");
    }

    if (hour < 5) {
      return t("tools.plana.emptyState.suggestions.greetingNight");
    }

    if (hour < 18) {
      return t("tools.plana.emptyState.suggestions.greetingAfternoon");
    }

    return t("tools.plana.emptyState.suggestions.greetingEvening");
  };
  const heading = senseiName
    ? t("tools.plana.emptyState.headingNamed", {
        name: senseiName,
      })
    : t("tools.plana.emptyState.heading");

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <PlanaChatAvatar className="size-16" />
          <div className="space-y-1">
            <h2 className="font-semibold text-2xl tracking-tight">{heading}</h2>
            <p className="text-muted-foreground">
              {t("tools.plana.emptyState.body")}
            </p>
          </div>
        </div>

        {hasKey === false ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center">
            <div className="space-y-1">
              <p className="font-medium">
                {t("tools.plana.emptyState.setupTitle")}
              </p>

              <p className="text-muted-foreground text-sm">
                {t("tools.plana.emptyState.setupBody")}
              </p>
            </div>

            <Button onClick={onOpenSettings} type="button">
              {t("tools.plana.emptyState.setupAction")}
            </Button>
          </div>
        ) : (
          <>
            {composer}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTION_KEYS.map((key) => {
                const suggestion =
                  key === "greeting"
                    ? getGreetingSuggestion()
                    : t(`tools.plana.emptyState.suggestions.${key}`);

                return (
                  <button
                    className={cn(
                      "rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent",
                      key === "teaParty" && "hidden md:block",
                    )}
                    key={key}
                    onClick={() => onSelectSuggestion(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
