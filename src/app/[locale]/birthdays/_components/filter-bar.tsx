"use client";

import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

export function FilterBar({ search, onSearchChange }: FilterBarProps) {
  const t = useTranslations();

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("tools.birthdays.filters.searchPlaceholder")}
          className="pl-8"
        />
      </div>
    </div>
  );
}
