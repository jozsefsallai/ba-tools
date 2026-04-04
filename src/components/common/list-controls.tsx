"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoaderCircleIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const t = useTranslations();

  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("common.searchPlaceholder")}
        className="pl-9"
      />
    </div>
  );
}

export type LoadMoreButtonProps = {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (numItems: number) => void;
  numItems?: number;
};

export function LoadMoreButton({
  status,
  loadMore,
  numItems = 20,
}: LoadMoreButtonProps) {
  const t = useTranslations();

  if (status === "Exhausted" || status === "LoadingFirstPage") {
    return null;
  }

  return (
    <div className="flex justify-center">
      <Button
        variant="outline"
        onClick={() => loadMore(numItems)}
        disabled={status === "LoadingMore"}
      >
        {status === "LoadingMore" && (
          <LoaderCircleIcon className="animate-spin" />
        )}
        {status === "LoadingMore"
          ? t("common.loadingMore")
          : t("common.loadMore")}
      </Button>
    </div>
  );
}
