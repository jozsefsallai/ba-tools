"use client";

import type { PropsWithChildren } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function BannersTooltipProvider({ children }: PropsWithChildren) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
