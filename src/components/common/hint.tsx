import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReactNode } from "react";

type HintProps = {
  label: ReactNode;
  children: ReactNode;
};

export function Hint({ label, children }: HintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild className="cursor-help">
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
