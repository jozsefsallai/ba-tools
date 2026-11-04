"use client";

import { ChevronDownIcon, DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TimelineDownloadButtonProps = {
  label: string;
  disabled?: boolean;
  onDownload: () => void;
  includeFormation?: boolean;
  onIncludeFormationChange?: (include: boolean) => void;
};

export function TimelineDownloadButton({
  label,
  disabled,
  onDownload,
  includeFormation,
  onIncludeFormationChange,
}: TimelineDownloadButtonProps) {
  const t = useTranslations();

  const hasOptions = includeFormation !== undefined;

  return (
    <div className="flex items-center">
      <Button
        className={hasOptions ? "rounded-r-none" : undefined}
        disabled={disabled}
        onClick={onDownload}
      >
        <DownloadIcon />
        {label}
      </Button>

      {hasOptions && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="rounded-l-none border-l border-primary-foreground/20"
              aria-label={t("tools.timeline.actions.downloadOptions")}
            >
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={includeFormation}
              onCheckedChange={onIncludeFormationChange}
              onSelect={(event) => event.preventDefault()}
            >
              {t("tools.timeline.formation.includeInExport")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
