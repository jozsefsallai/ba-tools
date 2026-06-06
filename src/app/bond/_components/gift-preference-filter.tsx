"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export type GiftPreferenceFilterProps = {
  showAllGifts: boolean;
  filterStudentIds: Set<string>;
  targets: { studentId: string; studentName: string }[];
  onShowAllGiftsChange: (checked: boolean) => void;
  onFilterStudentToggle: (studentId: string, checked: boolean) => void;
};

export function GiftPreferenceFilter({
  showAllGifts,
  filterStudentIds,
  targets,
  onShowAllGiftsChange,
  onFilterStudentToggle,
}: GiftPreferenceFilterProps) {
  const t = useTranslations();

  const filterLabel = showAllGifts
    ? t("tools.bond.filter.allGifts")
    : t("tools.bond.filter.filtered");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[180px]">
          {filterLabel}
          <ChevronsUpDownIcon className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[220px]">
        <DropdownMenuCheckboxItem
          checked={showAllGifts}
          onCheckedChange={onShowAllGiftsChange}
          onSelect={(e) => e.preventDefault()}
        >
          {t("tools.bond.filter.allGifts")}
        </DropdownMenuCheckboxItem>

        {targets.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              {t("tools.bond.filter.preferredByGroup")}
            </DropdownMenuLabel>

            {targets.map((target) => (
              <DropdownMenuCheckboxItem
                key={target.studentId}
                checked={showAllGifts || filterStudentIds.has(target.studentId)}
                disabled={showAllGifts}
                onCheckedChange={(checked) =>
                  onFilterStudentToggle(target.studentId, checked)
                }
                onSelect={(e) => e.preventDefault()}
              >
                {target.studentName}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
