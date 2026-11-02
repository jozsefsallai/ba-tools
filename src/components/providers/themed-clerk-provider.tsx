"use client";

import { enUS, jaJP } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { dark as clerkDark } from "@clerk/themes";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { type PropsWithChildren, useMemo } from "react";

export function ThemedClerkProvider({ children }: PropsWithChildren) {
  const { resolvedTheme } = useTheme();
  const locale = useLocale();

  const clerkLocale = useMemo(() => {
    switch (locale) {
      case "en":
        return enUS;
      case "ja":
        return jaJP;
    }
  }, [
    locale,
  ]);

  return (
    <ClerkProvider
      appearance={{
        theme: resolvedTheme === "dark" ? clerkDark : undefined,
      }}
      localization={clerkLocale}
    >
      {children}
    </ClerkProvider>
  );
}
