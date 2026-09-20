import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: "My Timelines - Joe's Blue Archive Tools",
  description: "View your timelines saved in the cloud.",
  twitter: {
    card: "summary",
  },
};

export default async function MyTimelinesLayout({
  children,
}: PropsWithChildren) {
  await auth.protect();
  return children;
}
