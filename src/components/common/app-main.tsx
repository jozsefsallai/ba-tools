"use client";

import { JapaneseTranslationNotice } from "@/components/common/japanese-translation-notice";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import type { PropsWithChildren } from "react";
import { usePathname } from "@/i18n/navigation";

export function AppMain({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const locale = useLocale();
  const isPlanaAi = pathname.startsWith("/plana-ai");

  return (
    <div
      className={cn(
        "flex flex-1 flex-col p-4",
        isPlanaAi ? "min-h-0 overflow-hidden" : "gap-6",
      )}
    >
      {children}

      {locale === "ja" && !isPlanaAi ? <JapaneseTranslationNotice /> : null}
    </div>
  );
}
