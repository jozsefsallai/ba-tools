"use client";

import type { RosterStudentData } from "@/app/rosters/[gameServer]/[friendCode]/types";
import { StudentCard } from "@/components/common/student-card";

import bondImage from "@/assets/images/bond.png";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export type RosterItemProps = {
  item: RosterStudentData;
};

export function RosterItem({ item }: RosterItemProps) {
  return (
    <TooltipProvider>
      <div className="flex items-start gap-4 md:gap-6 bg-card border rounded-md p-4">
        <div style={{ zoom: 0.85 }}>
          <StudentCard
            student={item.student}
            level={item.level}
            starLevel={item.starLevel}
            ueLevel={item.ueLevel}
          />
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="md:text-xl font-bold">
              {item.student.name.split(" / ")[0]}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold">Skills:</div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">{item.ex}</Badge>
              </TooltipTrigger>

              <TooltipContent>EX Skill</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">{item.basic}</Badge>
              </TooltipTrigger>

              <TooltipContent>Basic Skill</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">{item.enhanced}</Badge>
              </TooltipTrigger>

              <TooltipContent>Enhanced Skill</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">{item.sub}</Badge>
              </TooltipTrigger>

              <TooltipContent>Subskill</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold">Equipment:</div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">
                  {item.equipmentSlot1 ? `T${item.equipmentSlot1}` : "XX"}
                </Badge>
              </TooltipTrigger>

              <TooltipContent>
                {item.student.equipment[0] ?? "Equipment Slot 1"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">
                  {item.equipmentSlot2 ? `T${item.equipmentSlot2}` : "XX"}
                </Badge>
              </TooltipTrigger>

              <TooltipContent>
                {item.student.equipment[1] ?? "Equipment Slot 2"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">
                  {item.equipmentSlot3 ? `T${item.equipmentSlot3}` : "XX"}
                </Badge>
              </TooltipTrigger>

              <TooltipContent>
                {item.student.equipment[2] ?? "Equipment Slot 3"}
              </TooltipContent>
            </Tooltip>

            {!!item.equipmentSlot4 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary">T{item.equipmentSlot4}</Badge>
                </TooltipTrigger>

                <TooltipContent>Bond Item</TooltipContent>
              </Tooltip>
            )}
          </div>

          {!!(item.attackLevel || item.hpLevel || item.healLevel) && (
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold">Talents:</div>

              {item.attackLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary">ATK{item.attackLevel}</Badge>
                  </TooltipTrigger>

                  <TooltipContent>Attack Talent Level</TooltipContent>
                </Tooltip>
              )}

              {item.hpLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary">HP{item.hpLevel}</Badge>
                  </TooltipTrigger>

                  <TooltipContent>HP Talent Level</TooltipContent>
                </Tooltip>
              )}

              {item.healLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary">HEAL{item.healLevel}</Badge>
                  </TooltipTrigger>

                  <TooltipContent>Heal Talent Level</TooltipContent>
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
