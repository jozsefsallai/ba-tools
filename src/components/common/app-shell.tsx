"use client";

import { AppMain } from "@/components/common/app-main";
import { AppSidebar } from "@/components/common/app-sidebar";
import { TheFooter } from "@/components/common/the-footer";
import { InsetHeader } from "@/components/common/the-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Suspense, type PropsWithChildren } from "react";

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
        <Suspense fallback={<div className="h-12 shrink-0 border-b" />}>
          <InsetHeader />
        </Suspense>

        <AppMain>{children}</AppMain>

        <TheFooter commitHash={commitHash} />
      </SidebarInset>
    </SidebarProvider>
  );
}
