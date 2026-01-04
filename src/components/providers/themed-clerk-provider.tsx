"use client";

import { useMemo, type PropsWithChildren } from "react";

import { useTheme } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { dark as clerkDark } from "@clerk/themes";
import { enUS, jaJP } from "@clerk/localizations";
import { useLocale } from "next-intl";

export function ThemedClerkProvider({ children }: PropsWithChildren) {
  const { resolvedTheme } = useTheme();
  const locale = useLocale();

  const clerkLocale = useMemo(() => {
    switch (locale) {
      case "en":
        return enUS;
      case "jp":
        return jaJP;
    }
  }, [locale]);

  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === "dark" ? clerkDark : undefined,
      }}
      localization={clerkLocale}
    >
      {children}
    </ClerkProvider>
  );
}
