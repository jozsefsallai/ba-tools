"use client";

import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudents } from "@/hooks/use-students";
import { useMutation } from "convex/react";
import { ChevronLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";
import type { Student } from "~prisma";

export function PVPEnemyPresetForm({
  seasonId,
  preset,
}: {
  seasonId: Id<"pvpSeason">;
  preset?: Doc<"pvpEnemyPreset">;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { studentMap } = useStudents();

  const create = useMutation(api.pvp.createEnemyPreset);
  const update = useMutation(api.pvp.updateEnemyPreset);

  const [name, setName] = useState(preset?.name ?? "");
  const [studentRep, setStudentRep] = useState<Student>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preset?.opponentStudentRepId) {
      setStudentRep(studentMap[preset.opponentStudentRepId]);
    }
  }, [preset, studentMap]);

  async function save() {
    setSaving(true);

    try {
      if (preset) {
        await update({
          presetId: preset._id,
          name,
          opponentName: name,
          opponentStudentRepId: studentRep?.id,
        });
      } else {
        await create({
          seasonId,
          name,
          opponentName: name,
          opponentStudentRepId: studentRep?.id,
        });
      }

      router.push(`/pvp/${seasonId}/presets/opponents`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pvp/${seasonId}/presets/opponents`}>
              <ChevronLeftIcon />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">
            {preset
              ? t("tools.pvp.presets.editEnemy")
              : t("tools.pvp.presets.createEnemy")}
          </h1>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="enemy-preset-name">
            {t("tools.pvp.presets.enemyName")}
          </Label>

          <Input
            id="enemy-preset-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label>{t("tools.pvp.presets.studentRep")}</Label>
          <StudentPicker onStudentSelected={setStudentRep}>
            <Button variant="outline" className="w-full justify-start">
              {studentRep?.name ?? t("tools.pvp.presets.selectStudent")}
            </Button>
          </StudentPicker>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/pvp/${seasonId}/presets/opponents`)}
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
