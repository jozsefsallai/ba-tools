"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { PropsWithChildren } from "react";

export function BannersTooltipProvider({ children }: PropsWithChildren) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
