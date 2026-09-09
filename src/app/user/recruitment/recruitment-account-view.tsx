"use client";

import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { buildStudentIconUrlFromId } from "@/lib/url";
import { useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { ChevronLeftIcon, PlusIcon, SaveIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export function RecruitmentAccountView({ accountId }: { accountId: string }) {
  const t = useTranslations();
  const result = useQuery(api.recruitment.getAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
  });
  const updateAccount = useMutation(api.recruitment.updateAccount);
  const [name, setName] = useState("");
  const [gameServer, setGameServer] = useState<GameServer>("JP");
  const [permanentCharge, setPermanentCharge] = useState<NumericInputValue>(0);
  const [limitedCharge, setLimitedCharge] = useState<NumericInputValue>(0);

  useEffect(() => {
    if (result) {
      setName(result.account.name);
      setGameServer(result.account.gameServer);
      setPermanentCharge(result.account.permanentCharge);
      setLimitedCharge(result.account.limitedCharge);
    }
  }, [result]);

  if (result === undefined)
    return <MessageBox>{t("common.loading")}</MessageBox>;
  if (!result)
    return <MessageBox>{t("tools.recruitment.failedToLoad")}</MessageBox>;

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" asChild className="self-start">
        <Link href="/user/recruitment">
          <ChevronLeftIcon />
          {t("common.backTo", {
            destination: t("tools.recruitment.title"),
          })}
        </Link>
      </Button>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{result.account.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t("tools.recruitment.gameServer", {
              server:
                GAME_SERVER_NAMES[result.account.gameServer as GameServer],
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/user/recruitment/${accountId}/analytics`}>
              {t("tools.recruitment.viewAnalytics")}
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/user/recruitment/${accountId}/sessions/new`}>
              <PlusIcon />
              {t("tools.recruitment.newSession")}
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2 rounded-md border p-4">
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="edit-account-name">
            {t("tools.recruitment.accountName")}
          </Label>
          <Input
            id="edit-account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
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
        <div className="flex w-24 flex-col gap-2">
          <Label htmlFor="edit-permanent-charge">
            {t("tools.recruitment.permanent")}
          </Label>
          <NumericInput
            id="edit-permanent-charge"
            min={0}
            max={200}
            value={permanentCharge}
            onValueChange={setPermanentCharge}
          />
        </div>
        <div className="flex w-24 flex-col gap-2">
          <Label htmlFor="edit-limited-charge">
            {t("tools.recruitment.limited")}
          </Label>
          <NumericInput
            id="edit-limited-charge"
            min={0}
            max={200}
            value={limitedCharge}
            onValueChange={setLimitedCharge}
          />
        </div>
        <Button
          onClick={async () => {
            if (permanentCharge === "" || limitedCharge === "") return;
            try {
              await updateAccount({
                accountId: accountId as Id<"recruitmentAccount">,
                name: name.trim(),
                gameServer,
                permanentCharge,
                limitedCharge,
              });
              toast.success(t("tools.recruitment.toasts.accountUpdated"));
            } catch {
              toast.error(t("tools.recruitment.toasts.accountUpdateFail"));
            }
          }}
          disabled={
            !name.trim() || permanentCharge === "" || limitedCharge === ""
          }
        >
          <SaveIcon />
          {t("common.saveChanges")}
        </Button>
      </div>
      {result.sessions.length === 0 ? (
        <MessageBox>{t("tools.recruitment.noSessions")}</MessageBox>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {result.sessions.map((session) => (
            <Link
              href={`/user/recruitment/${accountId}/sessions/${session._id}`}
              key={session._id}
            >
              <Card
                className="h-full transition-colors hover:bg-accent"
                style={
                  session.kind === "mixed"
                    ? {
                        borderTopColor:
                          RECRUITMENT_COLORS.base.labelBorderActive,
                        borderLeftColor:
                          RECRUITMENT_COLORS.base.labelBorderActive,
                        borderBottomColor:
                          RECRUITMENT_COLORS.limited.labelBorderActive,
                        borderRightColor:
                          RECRUITMENT_COLORS.limited.labelBorderActive,
                      }
                    : {
                        borderColor:
                          session.kind === "permanent"
                            ? RECRUITMENT_COLORS.base.labelBorderActive
                            : RECRUITMENT_COLORS.limited.labelBorderActive,
                      }
                }
              >
                <CardHeader>
                  <CardTitle className="flex justify-between gap-2 text-base">
                    <span>{session.name}</span>
                    <span
                      className={`text-xs uppercase${
                        session.kind === "mixed" ? " text-muted-foreground" : ""
                      }`}
                      style={{
                        color:
                          session.kind === "permanent"
                            ? RECRUITMENT_COLORS.base.labelTextActive
                            : session.kind === "limited"
                              ? RECRUITMENT_COLORS.limited.labelTextActive
                              : undefined,
                      }}
                    >
                      {session.kind === "mixed"
                        ? t("tools.recruitment.mixed")
                        : session.isFestBanner
                          ? t("tools.recruitment.festLimited")
                          : t(`tools.recruitment.${session.kind}`)}
                    </span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString()}
                  </p>
                  {session.pickupsObtained.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {session.pickupsObtained.map((pickup, index) => (
                        <img
                          key={`${pickup.studentId}-${index}`}
                          src={buildStudentIconUrlFromId(pickup.studentId)}
                          alt=""
                          className="size-8 rounded-full border-2 border-background object-cover shadow-sm"
                        />
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  <Stat
                    label={t("tools.recruitment.totalPulls")}
                    value={session.totalPulls}
                  />
                  <Stat
                    label={t("tools.recruitment.paidPulls")}
                    value={session.stats.paidPulls}
                  />
                  <Stat
                    label={t("tools.recruitment.pickups")}
                    value={session.stats.pickupCount}
                  />
                  <Stat
                    label={t("tools.recruitment.threeStars")}
                    value={session.threeStarCount}
                  />
                  <Stat
                    label={t("tools.recruitment.experiencedPURate")}
                    value={`${session.stats.experiencedPURate.toFixed(2)}%`}
                  />
                  <Stat
                    label={t("tools.recruitment.experiencedThreeStarRate")}
                    value={`${session.stats.experiencedThreeStarRate.toFixed(2)}%`}
                  />
                  <Stat
                    label={t("tools.recruitment.softPity")}
                    value={
                      session.stats.softPityWins +
                        session.stats.softPityLosses ===
                      0
                        ? "N/A"
                        : `${session.stats.softPityWins}/${session.stats.softPityLosses}`
                    }
                  />
                  <Stat
                    label={t("tools.recruitment.hardPity")}
                    value={
                      session.stats.hardPities === 0
                        ? "N/A"
                        : session.stats.hardPities
                    }
                  />
                  {session.kind === "mixed" ? (
                    <>
                      <Stat
                        color={RECRUITMENT_COLORS.limited.labelTextActive}
                        label={t("tools.recruitment.remainingLimitedCharge")}
                        value={
                          session.stats.limitedEndCharge ??
                          session.stats.pools?.limited.endCharge ??
                          "—"
                        }
                      />
                      <Stat
                        color={RECRUITMENT_COLORS.base.labelTextActive}
                        label={t("tools.recruitment.remainingPermanentCharge")}
                        value={
                          session.stats.permanentEndCharge ??
                          session.stats.pools?.permanent.endCharge ??
                          session.stats.endCharge
                        }
                      />
                    </>
                  ) : (
                    <Stat
                      color={
                        session.kind === "limited"
                          ? RECRUITMENT_COLORS.limited.labelTextActive
                          : RECRUITMENT_COLORS.base.labelTextActive
                      }
                      label={t("tools.recruitment.remainingCharge")}
                      value={
                        session.kind === "limited"
                          ? (session.stats.limitedEndCharge ??
                            session.stats.endCharge)
                          : (session.stats.permanentEndCharge ??
                            session.stats.endCharge)
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
