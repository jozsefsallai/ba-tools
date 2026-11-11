"use client";

import { useMutation } from "convex/react";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/app/[locale]/user/recruitment/_components/fields";
import type { Account } from "@/app/[locale]/user/recruitment/_components/types";
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

type AccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The account to edit. A new account is created when it is left out. */
  account?: Account;
};

export function AccountDialog({
  open,
  onOpenChange,
  account,
}: AccountDialogProps) {
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

  // Reset only when the dialog opens, not on every live account update.
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

    const fields = {
      name: name.trim(),
      gameServer,
      permanentCharge,
      limitedCharge,
    };

    setSaving(true);

    try {
      if (account) {
        await updateAccount({
          accountId: account._id,
          ...fields,
        });

        toast.success(t("tools.recruitment.toasts.accountUpdated"));
        onOpenChange(false);
      } else {
        const accountId = await createAccount(fields);

        toast.success(t("tools.recruitment.toasts.accountCreated"));
        onOpenChange(false);
        router.push(`/user/recruitment/${accountId}`);
      }
    } catch {
      toast.error(
        account
          ? t("tools.recruitment.toasts.accountUpdateFail")
          : t("tools.recruitment.toasts.accountCreateFail"),
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
            <Field
              className="sm:col-span-2"
              label={t("tools.recruitment.accountName")}
              htmlFor="recruitment-account-name"
            >
              <Input
                id="recruitment-account-name"
                autoFocus={!account}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <Field className="sm:col-span-2" label={t("common.gameServer")}>
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
            </Field>

            <Field
              label={t("tools.recruitment.permanentCharge")}
              htmlFor="recruitment-permanent-charge"
            >
              <NumericInput
                id="recruitment-permanent-charge"
                min={0}
                max={HARD_PITY}
                value={permanentCharge}
                onValueChange={setPermanentCharge}
              />
            </Field>

            <Field
              label={t("tools.recruitment.limitedCharge")}
              htmlFor="recruitment-limited-charge"
            >
              <NumericInput
                id="recruitment-limited-charge"
                min={0}
                max={HARD_PITY}
                value={limitedCharge}
                onValueChange={setLimitedCharge}
              />
            </Field>
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
