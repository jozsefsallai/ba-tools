import { auth } from "@clerk/nextjs/server";
import type { PropsWithChildren } from "react";

export default async function RecruitmentAccountLayout({
  children,
}: PropsWithChildren) {
  await auth.protect();
  return children;
}
