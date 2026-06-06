"use client";

import { JapaneseTranslationNotice } from "@/components/common/japanese-translation-notice";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

export function AppMain({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const locale = useLocale();
  const isPlanaAi = pathname.startsWith("/plana-ai");

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col p-4",
        isPlanaAi ? "overflow-hidden" : "gap-6",
      )}
    >
      {children}

      {locale === "jp" && !isPlanaAi ? <JapaneseTranslationNotice /> : null}
    </div>
  );
}
