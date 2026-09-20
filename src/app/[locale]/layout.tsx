import type { Metadata } from "next";
import { Outfit, Sono, Noto_Sans, Noto_Sans_JP } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { NavigationGuardProvider } from "next-navigation-guard";
import NextTopLoader from "nextjs-toploader";

import { AppShell } from "@/components/common/app-shell";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { StudentsProvider } from "@/components/providers/students-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemedClerkProvider } from "@/components/providers/themed-clerk-provider";
import { UserPreferencesProvider } from "@/components/providers/user-preferences-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";

import "../globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const sono = Sono({
  variable: "--font-sono",
  subsets: ["latin"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const nexonFootballGothic = localFont({
  src: [
    {
      path: "../_fonts/nexon-football-gothic/NEXON-Football-Gothic-L.otf",
      weight: "300",
    },
    {
      path: "../_fonts/nexon-football-gothic/NEXON-Football-Gothic-B.otf",
      weight: "700",
    },
  ],
  variable: "--font-nexon-football-gothic",
});

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BA Tools",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: localeParam } = await params;

  if (!hasLocale(routing.locales, localeParam)) {
    notFound();
  }

  const students = await db.student.findMany({
    orderBy: {
      defaultOrder: "asc",
    },
  });

  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`h-full ${outfit.variable} ${notoSansJP.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${sono.variable} ${nexonFootballGothic.variable} ${notoSans.variable} antialiased h-full`}
      >
        <NextTopLoader />

        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ThemedClerkProvider>
              <ConvexClientProvider>
                <NavigationGuardProvider>
                  <StudentsProvider loadedStudents={students}>
                    <UserPreferencesProvider>
                      <AppShell
                        commitHash={
                          process.env.VERCEL_GIT_COMMIT_SHA ?? "development"
                        }
                      >
                        {children}
                      </AppShell>

                      <Toaster />
                    </UserPreferencesProvider>
                  </StudentsProvider>
                </NavigationGuardProvider>
              </ConvexClientProvider>
            </ThemedClerkProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
