"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  BORROW_SLOT_GAMEMODE_NAMES,
  BORROW_SLOT_GAMEMODES,
  type GameServer,
  type BorrowSlotGameMode,
  type StarLevel,
  type UELevel,
} from "@/lib/types";
import { buildStudentPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Student } from "~prisma";
import React, { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

export type RosterItem = {
  enabled: boolean;
  student: Student;
  starLevel: StarLevel;
  ueLevel: UELevel | null;
  level: number;
  relationshipRank: number;
  ex: number;
  basic: number;
  enhanced: number;
  sub: number;
  equipmentSlot1: number;
  equipmentSlot2: number;
  equipmentSlot3: number;
  equipmentSlot4: number;
  attackLevel: number;
  hpLevel: number;
  healLevel: number;
  featuredBorrowSlot: BorrowSlotGameMode | null;
};

export type RosterItemEditorProps = {
  gameServer: GameServer;
  rosterItem: RosterItem;
  updateRosterItem: (
    studentId: string,
    updatedItem: Partial<RosterItem>,
  ) => void;
};

export const RosterItemEditor = React.memo(
  ({ gameServer, rosterItem, updateRosterItem }: RosterItemEditorProps) => {
    const t = useTranslations();
    const handleEnabledChange = useCallback(
      (newValue: boolean) => {
        updateRosterItem(rosterItem.student.id, { enabled: newValue });
      },
      [updateRosterItem],
    );

    const handleStarLevelChange = useCallback(
      (newLevel: StarLevel) => {
        updateRosterItem(rosterItem.student.id, { starLevel: newLevel });
      },
      [updateRosterItem],
    );

    const handleUELevelChange = useCallback(
      (newLevel: UELevel | null) => {
        updateRosterItem(rosterItem.student.id, { ueLevel: newLevel });
      },
      [updateRosterItem],
    );

    const handleLevelChange = useCallback(
      (newLevel: number) => {
        if (newLevel < 1 || newLevel > 90) {
          return;
        }

        updateRosterItem(rosterItem.student.id, { level: newLevel });
      },
      [updateRosterItem],
    );

    const handleRelaationshipRankChange = useCallback(
      (newRank: number) => {
        if (newRank < 1 || newRank > 100) {
          return;
        }

        updateRosterItem(rosterItem.student.id, { relationshipRank: newRank });
      },
      [updateRosterItem],
    );

    const handleEXLevelChange = useCallback(
      (newLevel: number) => {
        if (newLevel < 1 || newLevel > 5) {
          return;
        }

        updateRosterItem(rosterItem.student.id, { ex: newLevel });
      },
      [updateRosterItem],
    );

    const handleBasicLevelChange = useCallback(
      (newLevel: number) => {
        if (newLevel < 1 || newLevel > 10) {
          return;
        }

        updateRosterItem(rosterItem.student.id, { basic: newLevel });
      },
      [updateRosterItem],
    );

    const handleEnhancedLevelChange = useCallback(
      (newLevel: number) => {
        if (newLevel < 1 || newLevel > 10) {
          return;
        }

        updateRosterItem(rosterItem.student.id, { enhanced: newLevel });
      },
      [updateRosterItem],
    );

    const handleSubLevelChange = useCallback(
      (newLevel: number) => {
        if (newLevel < 1 || newLevel > 10) {
          return;
        }

        updateRosterItem(rosterItem.student.id, { sub: newLevel });
      },
      [updateRosterItem],
    );

    const handleEquipmentSlotTierChange = useCallback(
      (slot: 1 | 2 | 3 | 4, newTier: number) => {
        const min = 0;
        const max = slot === 4 ? 2 : 10;

        if (newTier < min || newTier > max) {
          return;
        }

        updateRosterItem(rosterItem.student.id, {
          [`equipmentSlot${slot}`]: newTier,
        });
      },
      [updateRosterItem],
    );

    const handleAttackLevelChange = useCallback(
      (newLevel: number) => {
        if (newLevel < 0 || newLevel > 25) {
          return;
        }

        updateRosterItem(rosterItem.student.id, { attackLevel: newLevel });
      },
      [updateRosterItem],
    );

    const handleHPLevelChange = useCallback(
      (newLevel: number) => {
        if (newLevel < 0 || newLevel > 25) {
          return;
        }

        updateRosterItem(rosterItem.student.id, { hpLevel: newLevel });
      },
      [updateRosterItem],
    );

    const handleHealLevelChange = useCallback(
      (newLevel: number) => {
        if (newLevel < 0 || newLevel > 25) {
          return;
        }

        updateRosterItem(rosterItem.student.id, { healLevel: newLevel });
      },
      [updateRosterItem],
    );

    const handleFeaturedBorrowSlotChange = useCallback(
      (newMode: BorrowSlotGameMode | null) => {
        updateRosterItem(rosterItem.student.id, {
          featuredBorrowSlot: newMode,
        });
      },
      [updateRosterItem],
    );

    const handleMaxButtonClick = useCallback(() => {
      updateRosterItem(rosterItem.student.id, {
        level: 90,
        starLevel: 5,
        ueLevel: 4,
        relationshipRank: 50,
        ex: 5,
        basic: 10,
        enhanced: 10,
        sub: 10,
        equipmentSlot1: 10,
        equipmentSlot2: 10,
        equipmentSlot3: 10,
        equipmentSlot4: hasBondItem ? 2 : undefined,
        attackLevel: 25,
        hpLevel: 25,
        healLevel: 25,
      });
    }, [updateRosterItem]);

    const hasBondItem = useMemo(() => {
      if (gameServer === "JP") {
        return rosterItem.student.hasBondGearJP;
      }

      if (gameServer === "CN") {
        return rosterItem.student.hasBondGearCN;
      }

      return rosterItem.student.hasBondGearGlobal;
    }, [rosterItem, gameServer]);

    return (
      <div
        className={cn("flex items-start gap-4 md:gap-6 border rounded-md p-4", {
          "bg-card": rosterItem.enabled,
          "grayscale opacity-75": !rosterItem.enabled,
        })}
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleEnabledChange(!rosterItem.enabled)}
            className="cursor-pointer"
          >
            <img
              src={buildStudentPortraitUrl(rosterItem.student)}
              alt={rosterItem.student.name.split(" / ")[0]}
              className="w-12"
            />
          </button>

          <Button
            onClick={handleMaxButtonClick}
            disabled={!rosterItem.enabled}
            variant="outline"
            size="sm"
            className="w-12 text-xs"
          >
            {t("tools.roster.rosterItemEditor.max")}
          </Button>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="md:text-xl font-bold">
              {rosterItem.student.name.split(" / ")[0]}
            </div>

            <Switch
              key={`roster-item-${rosterItem.student.id}`}
              className="self-center"
              checked={rosterItem.enabled}
              onCheckedChange={handleEnabledChange}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 items-center gap-1">
              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.level")}</Label>

                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={rosterItem?.level ?? ""}
                  onChange={(e) => handleLevelChange(Number(e.target.value))}
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.star")}</Label>

                <Select
                  value={rosterItem?.starLevel?.toString() ?? ""}
                  onValueChange={(value) =>
                    handleStarLevelChange(
                      Number.parseInt(value, 10) as StarLevel,
                    )
                  }
                  disabled={!rosterItem.enabled}
                >
                  <SelectTrigger className="w-full py-1 px-2 h-auto">
                    {rosterItem?.starLevel ? <SelectValue /> : "N/A"}
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.ue")}</Label>

                <Select
                  value={rosterItem?.ueLevel?.toString() ?? ""}
                  onValueChange={(value) =>
                    handleUELevelChange(
                      value === "_"
                        ? null
                        : (Number.parseInt(value, 10) as UELevel),
                    )
                  }
                  disabled={!rosterItem.enabled}
                >
                  <SelectTrigger className="w-full py-1 px-2 h-auto">
                    {rosterItem?.ueLevel ? <SelectValue /> : "N/A"}
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="_">-</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.bond")}</Label>

                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={rosterItem?.relationshipRank ?? ""}
                  onChange={(e) =>
                    handleRelaationshipRankChange(Number(e.target.value))
                  }
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-5 items-center gap-1">
              <Label className="text-xs pt-[15px]">{t("tools.roster.rosterItemEditor.skills")}</Label>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.ex")}</Label>

                <Input
                  placeholder={t("tools.roster.rosterItemEditor.ex")}
                  type="number"
                  min={1}
                  max={5}
                  value={rosterItem?.ex ?? ""}
                  onChange={(e) => handleEXLevelChange(Number(e.target.value))}
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.basic")}</Label>

                <Input
                  placeholder={t("tools.roster.rosterItemEditor.basic")}
                  type="number"
                  min={1}
                  max={10}
                  value={rosterItem?.basic ?? ""}
                  onChange={(e) =>
                    handleBasicLevelChange(Number(e.target.value))
                  }
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.enhanced")}</Label>

                <Input
                  placeholder={t("tools.roster.rosterItemEditor.enh")}
                  type="number"
                  min={1}
                  max={10}
                  value={rosterItem?.enhanced ?? ""}
                  onChange={(e) =>
                    handleEnhancedLevelChange(Number(e.target.value))
                  }
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.sub")}</Label>

                <Input
                  placeholder={t("tools.roster.rosterItemEditor.sub")}
                  type="number"
                  min={1}
                  max={10}
                  value={rosterItem?.sub ?? ""}
                  onChange={(e) => handleSubLevelChange(Number(e.target.value))}
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-5 items-center gap-1">
              <Label className="text-xs pt-[15px]">{t("tools.roster.rosterItemEditor.equipment")}</Label>

              <div className="flex flex-col">
                <Label className="text-[10px]">
                  {rosterItem.student.equipment[0] ?? t("tools.roster.rosterItemEditor.slot1")}
                </Label>

                <Input
                  placeholder={rosterItem.student.equipment[0] ?? t("tools.roster.rosterItemEditor.s1")}
                  type="number"
                  min={0}
                  max={10}
                  value={rosterItem?.equipmentSlot1 ?? ""}
                  onChange={(e) =>
                    handleEquipmentSlotTierChange(1, Number(e.target.value))
                  }
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">
                  {rosterItem.student.equipment[1] ?? t("tools.roster.rosterItemEditor.slot2")}
                </Label>

                <Input
                  placeholder={rosterItem.student.equipment[1] ?? t("tools.roster.rosterItemEditor.s2")}
                  type="number"
                  min={0}
                  max={10}
                  value={rosterItem?.equipmentSlot2 ?? ""}
                  onChange={(e) =>
                    handleEquipmentSlotTierChange(2, Number(e.target.value))
                  }
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">
                  {rosterItem.student.equipment[2] ?? t("tools.roster.rosterItemEditor.slot3")}
                </Label>

                <Input
                  placeholder={rosterItem.student.equipment[2] ?? t("tools.roster.rosterItemEditor.s3")}
                  type="number"
                  min={0}
                  max={10}
                  value={rosterItem?.equipmentSlot3 ?? ""}
                  onChange={(e) =>
                    handleEquipmentSlotTierChange(3, Number(e.target.value))
                  }
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>

              {hasBondItem && (
                <div className="flex flex-col">
                  <Label className="text-[10px]">
                    {rosterItem.student.equipment[3] ?? t("tools.roster.rosterItemEditor.bondItem")}
                  </Label>

                  <Input
                    placeholder={t("tools.roster.rosterItemEditor.bg")}
                    type="number"
                    min={0}
                    max={2}
                    value={rosterItem?.equipmentSlot4 ?? ""}
                    onChange={(e) =>
                      handleEquipmentSlotTierChange(4, Number(e.target.value))
                    }
                    className="w-full py-1 px-2 h-auto"
                    disabled={!rosterItem.enabled}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 items-center gap-1">
              <Label className="text-xs pt-[15px]">{t("tools.roster.rosterItemEditor.talent")}</Label>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.attack")}</Label>

                <Input
                  placeholder={t("tools.roster.rosterItemEditor.atk")}
                  type="number"
                  min={0}
                  max={25}
                  value={rosterItem?.attackLevel ?? ""}
                  onChange={(e) =>
                    handleAttackLevelChange(Number(e.target.value))
                  }
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.hp")}</Label>

                <Input
                  placeholder={t("tools.roster.rosterItemEditor.hp")}
                  type="number"
                  min={0}
                  max={25}
                  value={rosterItem?.hpLevel ?? ""}
                  onChange={(e) => handleHPLevelChange(Number(e.target.value))}
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>

              <div className="flex flex-col">
                <Label className="text-[10px]">{t("tools.roster.rosterItemEditor.healing")}</Label>

                <Input
                  placeholder={t("tools.roster.rosterItemEditor.heal")}
                  type="number"
                  min={0}
                  max={25}
                  value={rosterItem?.healLevel ?? ""}
                  onChange={(e) =>
                    handleHealLevelChange(Number(e.target.value))
                  }
                  className="w-full py-1 px-2 h-auto"
                  disabled={!rosterItem.enabled}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t("tools.roster.rosterItemEditor.featuredBorrowSlot")}</Label>

              <Select
                value={rosterItem?.featuredBorrowSlot ?? ""}
                onValueChange={(value) =>
                  handleFeaturedBorrowSlotChange(
                    value === "_" ? null : (value as BorrowSlotGameMode),
                  )
                }
                disabled={!rosterItem.enabled}
              >
                <SelectTrigger className="w-full py-1 px-2 h-auto">
                  {rosterItem?.featuredBorrowSlot ? <SelectValue /> : t("tools.roster.rosterItemEditor.none")}
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="_">{t("tools.roster.rosterItemEditor.notFeatured")}</SelectItem>

                  {BORROW_SLOT_GAMEMODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {BORROW_SLOT_GAMEMODE_NAMES[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
