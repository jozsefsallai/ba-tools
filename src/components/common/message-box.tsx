import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type MessageBoxProps = {
  children: ReactNode;
  className?: string;
};

export function MessageBox({ children, className }: MessageBoxProps) {
  return (
    <div
      className={cn(
        "border rounded-md px-4 py-10 text-center text-xl text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
