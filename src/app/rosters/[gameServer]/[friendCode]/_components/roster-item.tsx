"use client";

import type { RosterStudentData } from "@/app/rosters/[gameServer]/[friendCode]/types";
import { StudentCard } from "@/components/common/student-card";

import bondImage from "@/assets/images/bond.png";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

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
          "flex items-start gap-4 md:gap-6 rounded-md p-4",
          featured
            ? "border-primary ring-1 ring-primary/30 bg-primary/5 shadow-sm"
            : "bg-card border",
        )}
      >
        <div style={{ zoom: featured ? 0.95 : 0.85 }}>
          <StudentCard
            student={item.student}
            level={item.level}
            starLevel={item.starLevel}
            ueLevel={item.ueLevel}
            borrowed={featured}
          />
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="md:text-xl font-bold">
              {item.student.name.split(" / ")[0]}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold">
              {t("tools.roster.view.skills")}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">{item.ex}</Badge>
              </TooltipTrigger>

              <TooltipContent>{t("tools.roster.view.exSkill")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">{item.basic}</Badge>
              </TooltipTrigger>

              <TooltipContent>
                {t("tools.roster.view.basicSkill")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">{item.enhanced}</Badge>
              </TooltipTrigger>

              <TooltipContent>
                {t("tools.roster.view.enhancedSkill")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">{item.sub}</Badge>
              </TooltipTrigger>

              <TooltipContent>{t("tools.roster.view.subskill")}</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold">
              {t("tools.roster.view.equipment")}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">
                  {item.equipmentSlot1 ? `T${item.equipmentSlot1}` : "XX"}
                </Badge>
              </TooltipTrigger>

              <TooltipContent>
                {item.student.equipment[0] ??
                  t("tools.roster.view.equipmentSlot1")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">
                  {item.equipmentSlot2 ? `T${item.equipmentSlot2}` : "XX"}
                </Badge>
              </TooltipTrigger>

              <TooltipContent>
                {item.student.equipment[1] ??
                  t("tools.roster.view.equipmentSlot2")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">
                  {item.equipmentSlot3 ? `T${item.equipmentSlot3}` : "XX"}
                </Badge>
              </TooltipTrigger>

              <TooltipContent>
                {item.student.equipment[2] ??
                  t("tools.roster.view.equipmentSlot3")}
              </TooltipContent>
            </Tooltip>

            {!!item.equipmentSlot4 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary">T{item.equipmentSlot4}</Badge>
                </TooltipTrigger>

                <TooltipContent>
                  {t("tools.roster.view.bondItem")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {!!(item.attackLevel || item.hpLevel || item.healLevel) && (
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold">
                {t("tools.roster.view.talents")}
              </div>

              {!!item.attackLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary">ATK{item.attackLevel}</Badge>
                  </TooltipTrigger>

                  <TooltipContent>
                    {t("tools.roster.view.attackTalentLevel")}
                  </TooltipContent>
                </Tooltip>
              )}

              {!!item.hpLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary">HP{item.hpLevel}</Badge>
                  </TooltipTrigger>

                  <TooltipContent>
                    {t("tools.roster.view.hpTalentLevel")}
                  </TooltipContent>
                </Tooltip>
              )}

              {!!item.healLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary">HEAL{item.healLevel}</Badge>
                  </TooltipTrigger>

                  <TooltipContent>
                    {t("tools.roster.view.healTalentLevel")}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center border rounded-md p-2">
          <Image src={bondImage} alt="🩷" className="size-4" />
          <span className="text-sm font-semibold">{item.relationshipRank}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
