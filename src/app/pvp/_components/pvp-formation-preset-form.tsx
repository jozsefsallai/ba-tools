"use client";

import { PVPMatchFormationEditor } from "@/app/pvp/_components/pvp-match-formation-editor";
import type {
  PVPFormationPresetType,
  PVPFormationStudentItem,
} from "@/app/pvp/_lib/types";
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
import { useStudents } from "@/hooks/use-students";
import { useMutation } from "convex/react";
import { ChevronLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

const blankTeam = (): PVPFormationStudentItem[] => [{}, {}, {}, {}, {}, {}];

export function PVPFormationPresetForm({
  seasonId,
  preset,
}: {
  seasonId: Id<"pvpSeason">;
  preset?: Doc<"pvpFormationPreset">;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { studentMap } = useStudents();

  const create = useMutation(api.pvp.createFormationPreset);
  const update = useMutation(api.pvp.updateFormationPreset);

  const [name, setName] = useState(preset?.name ?? "");
  const [usedByMe, setUsedByMe] = useState(preset?.usedByMe ?? true);
  const [matchType, setMatchType] = useState<PVPFormationPresetType>(
    preset?.matchType ?? "both",
  );
  const [advanced, setAdvanced] = useState(true);
  const [team, setTeam] = useState<PVPFormationStudentItem[]>(blankTeam);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preset) {
      return;
    }

    setTeam(
      preset.team.map((item) => ({
        student: item.studentId ? studentMap[item.studentId] : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
      })),
    );
  }, [preset, studentMap]);

  const updateSlot = (index: number, value: Partial<PVPFormationStudentItem>) =>
    setTeam((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...value } : item,
      ),
    );

  async function save() {
    setSaving(true);

    try {
      const persistedTeam = team.map((item) => ({
        studentId: item.student?.id,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
      }));

      if (preset) {
        await update({
          presetId: preset._id,
          name,
          matchType,
          usedByMe,
          team: persistedTeam,
        });
      } else {
        await create({
          seasonId,
          name,
          matchType,
          usedByMe,
          team: persistedTeam,
        });
      }

      router.push(`/pvp/${seasonId}/presets/formations`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pvp/${seasonId}/presets/formations`}>
              <ChevronLeftIcon />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">
            {preset
              ? t("tools.pvp.presets.editFormation")
              : t("tools.pvp.presets.createFormation")}
          </h1>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
        <div className="flex flex-col gap-1">
          <Label htmlFor="formation-preset-name">
            {t("tools.pvp.presets.formationName")}
          </Label>

          <Input
            id="formation-preset-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 pb-2">
          <Switch
            id="formation-used-by-me"
            checked={usedByMe}
            onCheckedChange={setUsedByMe}
          />

          <Label htmlFor="formation-used-by-me">
            {t("tools.pvp.presets.usedByMe")}
          </Label>
        </div>

        <div className="flex flex-col gap-1">
          <Label>{t("tools.pvp.presets.formationType")}</Label>

          <Select
            value={matchType}
            onValueChange={(value) =>
              setMatchType(value as PVPFormationPresetType)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attack">
                {t("tools.pvp.presets.attack")}
              </SelectItem>

              <SelectItem value="defense">
                {t("tools.pvp.presets.defense")}
              </SelectItem>

              <SelectItem value="both">
                {t("tools.pvp.presets.both")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <PVPMatchFormationEditor
          formation={team}
          onUpdate={updateSlot}
          advanced={advanced}
          onAdvancedChange={setAdvanced}
          showDamage={false}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/pvp/${seasonId}/presets/formations`)}
        >
          {t("tools.pvp.presets.cancel")}
        </Button>

        <Button disabled={!name.trim() || saving} onClick={() => void save()}>
          {saving
            ? t("tools.pvp.presets.saving")
            : preset
              ? t("tools.pvp.presets.saveChanges")
              : t("tools.pvp.presets.create")}
        </Button>
      </div>
    </div>
  );
}
