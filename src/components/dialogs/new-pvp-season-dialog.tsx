"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
import { GAME_SERVER_NAMES, GAME_SERVERS, type GameServer } from "@/lib/types";
import { useMutation } from "convex/react";
import { type PropsWithChildren, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type NewPVPSeasonDialogProps = PropsWithChildren<{
  onCreate?: (id: Id<"pvpSeason">) => any;
}>;

export function NewPVPSeasonDialog({
  onCreate,
  children,
}: NewPVPSeasonDialogProps) {
  const [name, setName] = useState("");
  const [gameServer, setGameServer] = useState<GameServer>("JP");

  const [requestInProgress, setRequestInProgress] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);

  const createMutation = useMutation(api.pvp.createSeason);

  async function handleCreate() {
    if (requestInProgress) {
      return;
    }

    setRequestInProgress(true);

    try {
      const seasonId = await createMutation({ name, gameServer });
      await onCreate?.(seasonId);
      closeRef.current?.click();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create PVP season.");
    } finally {
      setRequestInProgress(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>New PVP Season</DialogTitle>
          <DialogDescription>
            Enter the name and game server of this PVP season.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="pvp-season-name" className="w-32">
              Season Name
            </Label>
            <Input
              id="pvp-season-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="w-32">Game Server</Label>

            <Select
              value={gameServer}
              onValueChange={(value) => setGameServer(value as GameServer)}
            >
              <SelectTrigger>
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
        </div>

        <DialogFooter>
          <DialogClose ref={closeRef} />

          <Button
            type="submit"
            onClick={handleCreate}
            disabled={requestInProgress}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
