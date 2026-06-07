"use client";

import { RosterBondRank } from "@/app/rosters/[gameServer]/[friendCode]/_components/roster-bond-rank";
import { RosterItemStudentIcon } from "@/app/rosters/[gameServer]/[friendCode]/_components/roster-item-student-icon";
import { RosterStatBadge } from "@/app/rosters/[gameServer]/[friendCode]/_components/roster-stat-badge";
import { RosterStatRow } from "@/app/rosters/[gameServer]/[friendCode]/_components/roster-stat-row";
import type { RosterStudentData } from "@/app/rosters/[gameServer]/[friendCode]/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type RosterItemProps = {
  item: RosterStudentData;
  featured?: boolean;
};

export function RosterItem({ item, featured = false }: RosterItemProps) {
  const t = useTranslations();

  return (
    <TooltipProvider>
      <div
        className={cn(
          "min-w-0 max-w-full rounded-md p-3 md:px-4 md:py-5",
          featured
            ? "border-primary ring-1 ring-primary/30 bg-primary/5 shadow-sm"
            : "bg-card border",
        )}
      >
        <div className="flex min-w-0 items-start gap-3 md:gap-6">
          <RosterItemStudentIcon
            student={item.student}
            level={item.level}
            starLevel={item.starLevel}
            ueLevel={item.ueLevel}
            featured={featured}
          />

          <div className="relative min-w-0 flex-1 pr-11 md:pr-0">
            <RosterBondRank rank={item.relationshipRank} variant="inline" />

            <div className="flex flex-col gap-1.5 md:gap-3">
              <div className="min-w-0 text-base font-bold leading-snug break-words sm:text-lg md:text-xl">
                {item.student.name.split(" / ")[0]}
              </div>

              <RosterStatRow label={t("tools.roster.view.skills")}>
                <RosterStatBadge label={t("tools.roster.view.exSkill")}>
                  {item.ex}
                </RosterStatBadge>
                <RosterStatBadge label={t("tools.roster.view.basicSkill")}>
                  {item.basic}
                </RosterStatBadge>
                <RosterStatBadge label={t("tools.roster.view.enhancedSkill")}>
                  {item.enhanced}
                </RosterStatBadge>
                <RosterStatBadge label={t("tools.roster.view.subskill")}>
                  {item.sub}
                </RosterStatBadge>
              </RosterStatRow>

              <RosterStatRow label={t("tools.roster.view.equipment")}>
                <RosterStatBadge
                  label={
                    item.student.equipment[0] ??
                    t("tools.roster.view.equipmentSlot1")
                  }
                >
                  {item.equipmentSlot1 ? `T${item.equipmentSlot1}` : "XX"}
                </RosterStatBadge>
                <RosterStatBadge
                  label={
                    item.student.equipment[1] ??
                    t("tools.roster.view.equipmentSlot2")
                  }
                >
                  {item.equipmentSlot2 ? `T${item.equipmentSlot2}` : "XX"}
                </RosterStatBadge>
                <RosterStatBadge
                  label={
                    item.student.equipment[2] ??
                    t("tools.roster.view.equipmentSlot3")
                  }
                >
                  {item.equipmentSlot3 ? `T${item.equipmentSlot3}` : "XX"}
                </RosterStatBadge>
                {!!item.equipmentSlot4 && (
                  <RosterStatBadge label={t("tools.roster.view.bondItem")}>
                    T{item.equipmentSlot4}
                  </RosterStatBadge>
                )}
              </RosterStatRow>

              {!!(item.attackLevel || item.hpLevel || item.healLevel) && (
                <RosterStatRow label={t("tools.roster.view.talents")}>
                  {!!item.attackLevel && (
                    <RosterStatBadge
                      label={t("tools.roster.view.attackTalentLevel")}
                    >
                      ATK{item.attackLevel}
                    </RosterStatBadge>
                  )}
                  {!!item.hpLevel && (
                    <RosterStatBadge
                      label={t("tools.roster.view.hpTalentLevel")}
                    >
                      HP{item.hpLevel}
                    </RosterStatBadge>
                  )}
                  {!!item.healLevel && (
                    <RosterStatBadge
                      label={t("tools.roster.view.healTalentLevel")}
                    >
                      HEAL{item.healLevel}
                    </RosterStatBadge>
                  )}
                </RosterStatRow>
              )}
            </div>
          </div>

          <RosterBondRank rank={item.relationshipRank} variant="column" />
        </div>
      </div>
    </TooltipProvider>
  );
}
