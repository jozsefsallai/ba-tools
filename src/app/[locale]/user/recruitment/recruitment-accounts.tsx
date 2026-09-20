"use client";

import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
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
import { RECRUITMENT_COLORS } from "@/lib/recruitment";
import { GAME_SERVERS, GAME_SERVER_NAMES, type GameServer } from "@/lib/types";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import { Link } from "@/i18n/navigation";

function ChargeBar({
  value,
  limited,
}: {
  value: number;
  limited: boolean;
}) {
  const colors = limited ? RECRUITMENT_COLORS.limited : RECRUITMENT_COLORS.base;
  return (
    <div className="relative h-3 overflow-visible rounded-full bg-[#d4d4d4]/45 dark:bg-[#d4d4d4]/20">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{
          width: `${Math.min(100, (value / 200) * 100)}%`,
          backgroundColor: colors.trackAccent,
        }}
      />
      <div
        className="absolute left-1/2 top-[-2px] h-4 w-px"
        style={{ backgroundColor: RECRUITMENT_COLORS.labelBorder }}
      />
    </div>
  );
}

export function RecruitmentAccounts() {
  const locale = useLocale();
  const t = useTranslations();
  const accounts = useQuery(api.recruitment.getOwnAccounts);
  const createAccount = useMutation(api.recruitment.createAccount);
  const [name, setName] = useState("");
  const [gameServer, setGameServer] = useState<GameServer>("JP");
  const [permanentCharge, setPermanentCharge] = useState<NumericInputValue>(0);
  const [limitedCharge, setLimitedCharge] = useState<NumericInputValue>(0);

  async function handleCreate() {
    if (!name.trim() || permanentCharge === "" || limitedCharge === "") return;
    try {
      await createAccount({
        name: name.trim(),
        gameServer,
        permanentCharge,
        limitedCharge,
      });
      setName("");
      setPermanentCharge(0);
      setLimitedCharge(0);
      toast.success(t("tools.recruitment.toasts.accountCreated"));
    } catch {
      toast.error(t("tools.recruitment.toasts.accountCreateFail"));
    }
  }

  if (accounts === undefined)
    return <MessageBox>{t("common.loading")}</MessageBox>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">{t("tools.recruitment.title")}</h1>
        <p>{t("tools.recruitment.description")}</p>
        {locale !== "ja" && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            {t.rich("tools.recruitment.systemNotice", {
              strong: (children) => <strong>{children}</strong>,
            })}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2 rounded-md border p-4">
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="account-name">
            {t("tools.recruitment.accountName")}
          </Label>
          <Input
            id="account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex w-24 flex-col gap-2">
          <Label htmlFor="permanent-charge">
            {t("tools.recruitment.permanent")}
          </Label>
          <NumericInput
            id="permanent-charge"
            min={0}
            max={200}
            value={permanentCharge}
            onValueChange={setPermanentCharge}
          />
        </div>
        <div className="flex w-24 flex-col gap-2">
          <Label htmlFor="limited-charge">
            {t("tools.recruitment.limited")}
          </Label>
          <NumericInput
            id="limited-charge"
            min={0}
            max={200}
            value={limitedCharge}
            onValueChange={setLimitedCharge}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("common.gameServer")}</Label>
          <Select
            value={gameServer}
            onValueChange={(value) => setGameServer(value as GameServer)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GAME_SERVERS.map((server) => (
                <SelectItem
                  key={server}
                  value={server}
                  disabled={server !== "JP"}
                >
                  {GAME_SERVER_NAMES[server]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleCreate}
          disabled={
            !name.trim() || permanentCharge === "" || limitedCharge === ""
          }
        >
          {t("common.create")}
        </Button>
      </div>
      {accounts.length === 0 ? (
        <MessageBox>{t("tools.recruitment.noAccounts")}</MessageBox>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <Link
              key={account._id}
              href={`/user/recruitment/${account._id}`}
              className="rounded-md border p-4 transition-colors hover:bg-accent"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-semibold">{account.name}</h2>
                <span className="text-sm text-muted-foreground">
                  {GAME_SERVER_NAMES[account.gameServer]}
                </span>
              </div>
              <div className="grid gap-3 text-sm">
                <div>
                  <div className="mb-1 flex justify-between">
                    <span>{t("tools.recruitment.permanent")}</span>
                    <span>{account.permanentCharge}/200</span>
                  </div>
                  <ChargeBar value={account.permanentCharge} limited={false} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <span>{t("tools.recruitment.limited")}</span>
                    <span>{account.limitedCharge}/200</span>
                  </div>
                  <ChargeBar value={account.limitedCharge} limited />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
