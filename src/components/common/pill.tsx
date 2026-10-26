import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

type PillProps = ComponentProps<"span"> & {
  icon?: LucideIcon;
  /**
   * `solid` is meant for a colored background, which goes in `className`
   * (e.g. `bg-type-red`).
   */
  variant?: "outline" | "solid";
};

export function Pill({
  icon: Icon,
  variant = "outline",
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
        variant === "outline" && "bg-background",
        variant === "solid" &&
          "border-transparent font-semibold text-white shadow-sm",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </span>
  );
}
