import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { PropsWithChildren } from "react";

type DetailSectionProps = PropsWithChildren<{
  title: string;
  icon: LucideIcon;
  className?: string;
}>;

export function DetailSection({
  title,
  icon: Icon,
  className,
  children,
}: DetailSectionProps) {
  return (
    <section className={cn("bg-card rounded-xl border p-4", className)}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="text-sky-500 size-4" />
        <h2 className="font-semibold">{title}</h2>
      </div>

      {children}
    </section>
  );
}

export function DetailField({
  label,
  className,
  children,
}: PropsWithChildren<{ label: string; className?: string }>) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
