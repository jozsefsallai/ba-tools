"use client";

import { useMutation } from "convex/react";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NumericInput,
  type NumericInputValue,
} from "@/components/ui/numeric-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { HARD_PITY } from "@/lib/recruitment";
import {
  GAME_SERVER_NAMES,
  RECRUITMENT_GAME_SERVERS,
  type RecruitmentGameServer,
} from "@/lib/types";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type EditableAccount = {
  _id: Id<"recruitmentAccount">;
  name: string;
  gameServer: string;
  permanentCharge: number;
  limitedCharge: number;
};

export function AccountDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: EditableAccount;
}) {
  const t = useTranslations();
  const router = useRouter();
  const createAccount = useMutation(api.recruitment.createAccount);
  const updateAccount = useMutation(api.recruitment.updateAccount);
  const deleteAccount = useMutation(api.recruitment.deleteAccount);
  const [name, setName] = useState("");
  const [gameServer, setGameServer] = useState<RecruitmentGameServer>("JP");
  const [permanentCharge, setPermanentCharge] = useState<NumericInputValue>(0);
  const [limitedCharge, setLimitedCharge] = useState<NumericInputValue>(0);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(account?.name ?? "");
    setGameServer((account?.gameServer as RecruitmentGameServer) ?? "JP");
    setPermanentCharge(account?.permanentCharge ?? 0);
    setLimitedCharge(account?.limitedCharge ?? 0);
    setConfirmingDelete(false);
  }, [
    open,
  ]);

  const valid =
    name.trim() !== "" && permanentCharge !== "" && limitedCharge !== "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving) {
      return;
    }
    setSaving(true);
    try {
      if (account) {
        await updateAccount({
          accountId: account._id,
          name: name.trim(),
          gameServer,
          permanentCharge,
          limitedCharge,
        });
        toast.success(t("tools.recruitment.toasts.accountUpdated"));
        onOpenChange(false);
      } else {
        const created = await createAccount({
          name: name.trim(),
          gameServer,
          permanentCharge,
          limitedCharge,
        });
        toast.success(t("tools.recruitment.toasts.accountCreated"));
        onOpenChange(false);
        if (typeof created === "string") {
          router.push(`/user/recruitment/${created}`);
        }
      }
    } catch {
      toast.error(
        t(
          account
            ? "tools.recruitment.toasts.accountUpdateFail"
            : "tools.recruitment.toasts.accountCreateFail",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!account) {
      return;
    }
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    try {
      await deleteAccount({
        accountId: account._id,
      });
      toast.success(t("tools.recruitment.toasts.accountDeleted"));
      onOpenChange(false);
      router.push("/user/recruitment");
    } catch {
      toast.error(t("tools.recruitment.toasts.accountDeleteFail"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {account
                ? t("tools.recruitment.editAccount")
                : t("tools.recruitment.newAccount")}
            </DialogTitle>
            <DialogDescription>
              {t("tools.recruitment.accountChargesHint")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="recruitment-account-name">
                {t("tools.recruitment.accountName")}
              </Label>
              <Input
                id="recruitment-account-name"
                autoFocus={!account}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>{t("common.gameServer")}</Label>
              <Select
                value={gameServer}
                onValueChange={(value) =>
                  setGameServer(value as RecruitmentGameServer)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECRUITMENT_GAME_SERVERS.map((server) => (
                    <SelectItem key={server} value={server}>
                      {GAME_SERVER_NAMES[server]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recruitment-permanent-charge">
                {t("tools.recruitment.permanentCharge")}
              </Label>
              <NumericInput
                id="recruitment-permanent-charge"
                min={0}
                max={HARD_PITY}
                value={permanentCharge}
                onValueChange={setPermanentCharge}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recruitment-limited-charge">
                {t("tools.recruitment.limitedCharge")}
              </Label>
              <NumericInput
                id="recruitment-limited-charge"
                min={0}
                max={HARD_PITY}
                value={limitedCharge}
                onValueChange={setLimitedCharge}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {account ? (
              <Button
                type="button"
                variant={confirmingDelete ? "destructive" : "ghost"}
                className={
                  confirmingDelete ? undefined : "text-destructive sm:-ml-3"
                }
                onClick={handleDelete}
              >
                <Trash2Icon />
                {confirmingDelete
                  ? t("common.clickAgainToConfirm")
                  : t("tools.recruitment.deleteAccount")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={!valid || saving}>
                {account ? t("common.saveChanges") : t("common.create")}
              </Button>
            </div>
          </DialogFooter>
          {confirmingDelete && (
            <p className="text-sm text-destructive">
              {t("tools.recruitment.deleteAccountWarning")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
