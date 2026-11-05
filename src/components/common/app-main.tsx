"use client";

import { useLocale } from "next-intl";
import type { PropsWithChildren } from "react";
import { JapaneseTranslationNotice } from "@/components/common/japanese-translation-notice";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AppMain({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const locale = useLocale();
  const isPlanaAi = pathname.startsWith("/plana-ai");

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col",
        isPlanaAi ? "min-h-0 overflow-hidden" : "gap-6 p-4",
      )}
    >
      {children}

      {locale === "ja" && !isPlanaAi ? <JapaneseTranslationNotice /> : null}
    </div>
  );
}
