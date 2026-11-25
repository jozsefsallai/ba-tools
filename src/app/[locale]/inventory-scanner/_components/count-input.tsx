"use client";

import { useTranslations } from "next-intl";
import type { InventoryEntry } from "@/app/[locale]/inventory-scanner/_lib/entries";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CountInput({
  entry,
  name,
  onChange,
  className,
}: {
  entry: InventoryEntry;
  name: string;
  onChange: (key: string, value: string) => void;
  className?: string;
}) {
  const t = useTranslations();

  return (
    <Input
      value={entry.count ?? ""}
      onChange={(event) =>
        onChange(entry.key, event.target.value.replace(/\D/g, "").slice(0, 9))
      }
      inputMode="numeric"
      placeholder="–"
      aria-label={t("tools.inventoryScanner.review.countOf", {
        name,
      })}
      className={cn(
        "h-7 px-1 text-center text-sm tabular-nums md:text-sm",
        className,
      )}
    />
  );
}
