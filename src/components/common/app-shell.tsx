"use client";

import { AppMain } from "@/components/common/app-main";
import { TheFooter } from "@/components/common/the-footer";
import { InsetHeader } from "@/components/common/the-header";
import { AppSidebar } from "@/components/common/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

type AppShellProps = PropsWithChildren<{
  commitHash: string;
}>;

export function AppShell({ children, commitHash }: AppShellProps) {
  const pathname = usePathname();
  const isPlanaAi = pathname.startsWith("/plana-ai");

  return (
    <SidebarProvider className={cn(isPlanaAi && "h-svh overflow-hidden")}>
      <AppSidebar />
      <SidebarInset
        className={cn(
          isPlanaAi && "flex min-h-0 flex-1 flex-col overflow-hidden",
        )}
      >
        <InsetHeader />

        <AppMain>{children}</AppMain>

        <TheFooter commitHash={commitHash} />
      </SidebarInset>
    </SidebarProvider>
  );
}
