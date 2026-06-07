"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type RosterStatBadgeProps = {
  label: string;
  children: React.ReactNode;
};

export function RosterStatBadge({ label, children }: RosterStatBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className="h-5 px-1.5 py-0 text-[10px] leading-none sm:h-auto sm:px-2 sm:text-xs"
        >
          {children}
        </Badge>
      </TooltipTrigger>

      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
