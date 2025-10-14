import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

import { TheHeader } from "@/components/common/the-header";
import { TheFooter } from "@/components/common/the-footer";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemedClerkProvider } from "@/components/providers/themed-clerk-provider";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { UserPreferencesProvider } from "@/components/providers/user-preferences-provider";
import { db } from "@/lib/db";
import { StudentsProvider } from "@/components/providers/students-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      path: "./_fonts/nexon-football-gothic/NEXON-Football-Gothic-L.otf",
      weight: "300",
    },
    {
      path: "./_fonts/nexon-football-gothic/NEXON-Football-Gothic-B.otf",
      weight: "700",
    },
  ],
  variable: "--font-nexon-football-gothic",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const students = await db.student.findMany({
    orderBy: {
      defaultOrder: "asc",
    },
  });

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nexonFootballGothic.variable} ${notoSans.variable} antialiased h-full`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemedClerkProvider>
            <ConvexClientProvider>
              <StudentsProvider loadedStudents={students}>
                <UserPreferencesProvider>
                  <main className="flex flex-col gap-10 h-full">
                    <TheHeader />
                    <section className="relative container px-4 md:px-0 flex-1">
                      {children}
                    </section>
                    <TheFooter
                      commitHash={
                        process.env.VERCEL_GIT_COMMIT_SHA ?? "development"
                      }
                    />
                  </main>

                  <Toaster />
                </UserPreferencesProvider>
              </StudentsProvider>
            </ConvexClientProvider>
          </ThemedClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
