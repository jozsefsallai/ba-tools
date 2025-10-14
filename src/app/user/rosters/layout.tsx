import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: "My Rosters - Joe's Blue Archive Tools",
  description: "View and manage your Blue Archive rosters.",
  twitter: {
    card: "summary",
  },
};

export default async function MyRostersLayout({ children }: PropsWithChildren) {
  return children;
}
