import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import localFont from "next/font/local";

import { NotFoundView } from "@/components/common/not-found-view";

import "./globals.css";

export const metadata: Metadata = {
  title: "404 - Record not found - Joe's Blue Archive Tools",
  description: "The path you requested is not in my database.",
};

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`h-full ${outfit.variable}`}>
      <body
        className={`${nexonFootballGothic.variable} antialiased h-full bg-background text-foreground`}
      >
        <main className="flex min-h-full flex-col p-4">
          <NotFoundView
            code="404"
            description="The path you requested is not in my database."
            homeLabel="Go back home"
            quote="Sensei, I searched every directory I have access to. This page does not exist."
            title="Record not found"
          />
        </main>
      </body>
    </html>
  );
}
