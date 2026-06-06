"use client";

import { getSenseiDisplayName } from "@/app/plana-ai/_lib/sensei-name";
import { PlanaChatAvatar } from "@/app/plana-ai/_components/plana-chat-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

type SuggestionKey = "greeting" | "lore" | "teaParty" | "affection";

const SUGGESTION_KEYS: SuggestionKey[] = [
  "greeting",
  "lore",
  "teaParty",
  "affection",
];

function getGreetingSuggestion(
  t: ReturnType<typeof useTranslations<"tools.plana.emptyState.suggestions">>,
) {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return t("greetingMorning");
  }

  if (hour < 5) {
    return t("greetingNight");
  }

  if (hour < 18) {
    return t("greetingAfternoon");
  }

  return t("greetingEvening");
}

export function ChatEmptyState({
  onSelectSuggestion,
}: {
  onSelectSuggestion: (message: string) => void;
}) {
  const t = useTranslations();
  const tSuggestions = useTranslations("tools.plana.emptyState.suggestions");
  const { user } = useUser();
  const senseiName = getSenseiDisplayName(user);
  const heading = senseiName
    ? t("tools.plana.emptyState.headingNamed", { name: senseiName })
    : t("tools.plana.emptyState.heading");

  return (
    <div className="flex min-h-[360px] flex-1 items-center justify-center px-4">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-3xl border bg-card/80 p-8 text-center shadow-sm backdrop-blur">
        <div className="flex flex-col items-center gap-3">
          <PlanaChatAvatar className="size-24" />

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
            <p className="text-muted-foreground">
              {t("tools.plana.emptyState.body")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTION_KEYS.map((key) => {
            const suggestion =
              key === "greeting"
                ? getGreetingSuggestion(tSuggestions)
                : t(`tools.plana.emptyState.suggestions.${key}`);

            return (
              <Button
                className={cn(key === "teaParty" && "hidden md:inline-flex")}
                key={key}
                onClick={() => onSelectSuggestion(suggestion)}
                type="button"
                variant="outline"
              >
                {suggestion}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
