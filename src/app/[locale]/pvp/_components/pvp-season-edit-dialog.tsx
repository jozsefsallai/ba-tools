"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAME_SERVERS, GAME_SERVER_NAMES, PVP_SEASONS } from "@/lib/types";
import type { GameServer, PVPSeasonNumber } from "@/lib/types";
import { useMutation } from "convex/react";
import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc } from "~convex/dataModel";

export type PVPSeasonEditDialogProps = {
  season: Doc<"pvpSeason">;
};

export function PVPSeasonEditDialog({ season }: PVPSeasonEditDialogProps) {
  const t = useTranslations();
  const updateSeason = useMutation(api.pvp.updateSeason);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(season.name);
  const [gameServer, setGameServer] = useState<GameServer>(season.gameServer);
  const [seasonNumber, setSeasonNumber] = useState<PVPSeasonNumber | undefined>(
    season.seasonNumber,
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(season.name);
      setGameServer(season.gameServer);
      setSeasonNumber(season.seasonNumber);
    }
  }, [open, season]);

  async function handleSave() {
    if (!name.trim() || !seasonNumber || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await updateSeason({
        seasonId: season._id,
        name,
        gameServer,
        seasonNumber,
      });

      toast.success(t("tools.pvp.seasonEdit.saved"));
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(t("tools.pvp.seasonEdit.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon />
          {t("tools.pvp.seasonEdit.edit")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tools.pvp.seasonEdit.title")}</DialogTitle>

          <DialogDescription>
            {t("tools.pvp.seasonEdit.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pvp-season-edit-name">
              {t("tools.pvp.seasonEdit.name")}
            </Label>

            <Input
              id="pvp-season-edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pvp-season-edit-server">
              {t("tools.pvp.seasonEdit.gameServer")}
            </Label>

            <Select
              value={gameServer}
              onValueChange={(value) => setGameServer(value as GameServer)}
            >
              <SelectTrigger id="pvp-season-edit-server">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {GAME_SERVERS.map((server) => (
                  <SelectItem key={server} value={server}>
                    {GAME_SERVER_NAMES[server]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pvp-season-edit-number">
              {t("tools.pvp.seasonEdit.seasonNumber")}
            </Label>

            <Select
              value={seasonNumber?.toString() ?? ""}
              onValueChange={(value) =>
                setSeasonNumber(Number(value) as PVPSeasonNumber)
              }
            >
              <SelectTrigger id="pvp-season-edit-number">
                <SelectValue
                  placeholder={t("tools.pvp.season.selectSeasonNumber")}
                />
              </SelectTrigger>

              <SelectContent>
                {PVP_SEASONS.map((number) => (
                  <SelectItem key={number} value={number.toString()}>
                    {number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => void handleSave()}
            disabled={!name.trim() || !seasonNumber || isSaving}
          >
            {isSaving ? t("common.saving") : t("tools.pvp.seasonEdit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
