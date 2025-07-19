"use client";

import type { PropsWithChildren } from "react";

import { useTheme } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { dark as clerkDark } from "@clerk/themes";

export function ThemedClerkProvider({ children }: PropsWithChildren) {
  const { resolvedTheme } = useTheme();

  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === "dark" ? clerkDark : undefined,
      }}
    >
      {children}
    </ClerkProvider>
  );
}
