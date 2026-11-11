"use client";

import { useMutation, useQuery } from "convex/react";
import {
  CalculatorIcon,
  CalendarIcon,
  ChevronLeftIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Acquisitions,
  PullComposition,
} from "@/app/[locale]/user/recruitment/_components/session-analytics";
import {
  ChargeGauge,
  PoolMark,
  Readout,
} from "@/app/[locale]/user/recruitment/_components/shared";
import { MessageBox } from "@/components/common/message-box";
import { StudentPicker } from "@/components/common/student-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStudents } from "@/hooks/use-students";
import { Link, useRouter } from "@/i18n/navigation";
import { getErrorMessage } from "@/lib/convex-error";
import {
  type CanonicalPickup,
  calculateRecruitmentStats,
  normalizeRecruitmentSession,
  type PickupChargeError,
  pickupPoolKind,
  type RecruitmentKind,
  type RecruitmentSessionInput,
  type ResolvedPickupCharge,
  resolvePickupCharges,
} from "@/lib/recruitment";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Props = {
  accountId: string;
  sessionId?: string;
};
type RecruitmentPickupDraft = Omit<CanonicalPickup, "charge" | "kind"> & {
  charge: NumericInputValue;
  kind?: RecruitmentKind;
  // When set, the charge is worked out from `totalPulls` and `chargeAfter`
  calculated?: boolean;
  totalPulls?: NumericInputValue;
  chargeAfter?: NumericInputValue;
};

const PICKUP_CHARGE_ERROR_KEYS = {
  outOfOrder: "tools.recruitment.errors.pickupTotalOutOfOrder",
  exceedsSessionPulls: "tools.recruitment.errors.pickupTotalExceedsSession",
  noPullsLeft: "tools.recruitment.errors.pickupNoPullsLeft",
  aboveHardPity: "tools.recruitment.errors.pickupAboveHardPity",
  invalidNumbers: "tools.recruitment.errors.pickupInvalidNumbers",
} as const satisfies Record<PickupChargeError, string>;

function numberOrUndefined(value: NumericInputValue | undefined) {
  return value === "" ? undefined : value;
}

export function RecruitmentSessionEditor({ accountId, sessionId }: Props) {
  const t = useTranslations();
  const format = useFormatter();

  const router = useRouter();

  const { students } = useStudents();

  const accountResult = useQuery(api.recruitment.getAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
  });

  const sessionResult = useQuery(
    api.recruitment.getSession,
    sessionId
      ? {
          sessionId: sessionId as Id<"recruitmentSession">,
        }
      : "skip",
  );

  const createSession = useMutation(api.recruitment.createSession);
  const updateSession = useMutation(api.recruitment.updateSession);
  const deleteSession = useMutation(api.recruitment.deleteSession);

  const [name, setName] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isFestBanner, setIsFestBanner] = useState(false);
  const [permanentStartCharge, setPermanentStartCharge] =
    useState<NumericInputValue>(0);
  const [limitedStartCharge, setLimitedStartCharge] =
    useState<NumericInputValue>(0);
  const [previousTickets, setPreviousTickets] = useState<NumericInputValue>(0);
  const [rebateTicketsUsed, setRebateTicketsUsed] =
    useState<NumericInputValue>();
  const [permanentPulls, setPermanentPulls] = useState<NumericInputValue>(0);
  const [limitedPulls, setLimitedPulls] = useState<NumericInputValue>(0);
  const [threeStarCount, setThreeStarCount] = useState<NumericInputValue>(0);
  const [pickups, setPickups] = useState<RecruitmentPickupDraft[]>([]);

  useEffect(() => {
    if (sessionResult) {
      const normalized = normalizeRecruitmentSession(sessionResult);

      setName(sessionResult.name);
      setDate(new Date(sessionResult.date));
      setIsFestBanner(sessionResult.isFestBanner ?? false);
      setPermanentStartCharge(normalized.permanentStartCharge);
      setLimitedStartCharge(normalized.limitedStartCharge);
      setPreviousTickets(sessionResult.rebateTicketsFromPreviousSession);
      setRebateTicketsUsed(sessionResult.rebateTicketsUsed);
      setPermanentPulls(normalized.permanentPulls);
      setLimitedPulls(normalized.limitedPulls);
      setThreeStarCount(sessionResult.threeStarCount);
      setPickups(normalized.pickupsObtained);
    } else if (accountResult && !sessionId) {
      setPermanentStartCharge(accountResult.account.permanentCharge);
      setLimitedStartCharge(accountResult.account.limitedCharge);
      setPreviousTickets(
        accountResult.sessions[0]?.stats.remainingRebateTickets ?? 0,
      );
      setRebateTicketsUsed(undefined);
    }
  }, [
    sessionResult,
    accountResult,
    sessionId,
  ]);

  const resolvedCharges = useMemo<ResolvedPickupCharge[]>(() => {
    if (
      permanentStartCharge === "" ||
      limitedStartCharge === "" ||
      permanentPulls === "" ||
      limitedPulls === ""
    ) {
      return pickups.map(() => ({
        status: "pending",
      }));
    }

    const onlyPool =
      limitedPulls > 0 && permanentPulls === 0
        ? "limited"
        : permanentPulls > 0 && limitedPulls === 0
          ? "permanent"
          : undefined;

    return resolvePickupCharges(
      {
        permanent: {
          startCharge: permanentStartCharge,
          pulls: permanentPulls,
        },
        limited: {
          startCharge: limitedStartCharge,
          pulls: limitedPulls,
        },
      },
      pickups.map((pickup) => ({
        kind: pickup.kind ?? onlyPool,
        charge: numberOrUndefined(pickup.charge),
        totalPulls: numberOrUndefined(pickup.totalPulls),
        chargeAfter: numberOrUndefined(pickup.chargeAfter),
        calculated: pickup.calculated ?? false,
      })),
    );
  }, [
    permanentStartCharge,
    limitedStartCharge,
    permanentPulls,
    limitedPulls,
    pickups,
  ]);

  const input = useMemo<RecruitmentSessionInput | null>(() => {
    const charges = resolvedCharges.map((resolved) =>
      resolved.status === "ok" ? resolved.charge : null,
    );

    if (
      permanentStartCharge === "" ||
      limitedStartCharge === "" ||
      permanentPulls === "" ||
      limitedPulls === "" ||
      threeStarCount === "" ||
      previousTickets === "" ||
      (rebateTicketsUsed !== undefined && rebateTicketsUsed === "") ||
      charges.includes(null)
    ) {
      return null;
    }

    try {
      return normalizeRecruitmentSession({
        permanentStartCharge,
        limitedStartCharge,
        permanentPulls,
        limitedPulls,
        threeStarCount,
        rebateTicketsFromPreviousSession: previousTickets,
        rebateTicketsUsed,
        isFestBanner,
        pickupsObtained: pickups.map((pickup, index) => ({
          charge: charges[index] as number,
          studentId: pickup.studentId,
          kind: pickup.kind,
        })),
      });
    } catch {
      return {
        permanentStartCharge,
        limitedStartCharge,
        permanentPulls,
        limitedPulls,
        threeStarCount,
        rebateTicketsFromPreviousSession: previousTickets,
        rebateTicketsUsed,
        isFestBanner,
        pickupsObtained: pickups.map((pickup, index) => ({
          charge: charges[index] as number,
          studentId: pickup.studentId,
          kind: pickup.kind ?? "permanent",
        })),
      };
    }
  }, [
    permanentStartCharge,
    limitedStartCharge,
    permanentPulls,
    limitedPulls,
    threeStarCount,
    previousTickets,
    rebateTicketsUsed,
    isFestBanner,
    pickups,
    resolvedCharges,
  ]);

  function updatePickup(index: number, patch: Partial<RecruitmentPickupDraft>) {
    setPickups(
      pickups.map((item, i) =>
        i === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }
  const stats = useMemo(() => {
    if (!input) {
      return {
        value: null,
        error: null,
      };
    }

    try {
      return {
        value: calculateRecruitmentStats(input),
        error: null,
      };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : "Invalid session",
      };
    }
  }, [
    permanentStartCharge,
    limitedStartCharge,
    permanentPulls,
    limitedPulls,
    threeStarCount,
    previousTickets,
    rebateTicketsUsed,
    pickups,
    input,
  ]);

  function getRecruitmentErrorMessage(error: unknown) {
    const message = getErrorMessage(error);

    if (message.includes("Cannot recalculate")) {
      return t("tools.recruitment.errors.inconsistentHistory");
    }

    if (message.includes("chronological order")) {
      return t("tools.recruitment.errors.chronologicalOrder");
    }

    if (message.includes("Start charge must be")) {
      return t("tools.recruitment.errors.invalidStartCharge");
    }

    if (message.includes("Total pulls must be")) {
      return t("tools.recruitment.errors.invalidTotalPulls");
    }

    if (message.includes("3★ count")) {
      return t("tools.recruitment.errors.invalidThreeStarCount");
    }

    if (message.includes("Rebate tickets used")) {
      return t("tools.recruitment.errors.invalidTicketsUsed");
    }

    if (message.includes("Each pickup")) {
      return t("tools.recruitment.errors.invalidPickup");
    }

    if (message.includes("first pickup charge")) {
      return t("tools.recruitment.errors.firstPickupBelowStart");
    }

    if (message.includes("Pickup charges must")) {
      return t("tools.recruitment.errors.pickupsOutOfOrder");
    }

    if (message.includes("Pickup charges require")) {
      return t("tools.recruitment.errors.tooFewPulls");
    }

    return t("tools.recruitment.toasts.sessionSaveFail");
  }
  if (
    accountResult === undefined ||
    (sessionId && sessionResult === undefined)
  ) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (sessionId && !sessionResult) {
    return <MessageBox>{t("tools.recruitment.failedToLoad")}</MessageBox>;
  }

  async function save() {
    if (!stats.value || !input || !name.trim()) {
      return;
    }

    try {
      if (sessionId) {
        await updateSession({
          sessionId: sessionId as Id<"recruitmentSession">,
          name: name.trim(),
          date: date.getTime(),
          isFestBanner,
          permanentStartCharge: input.permanentStartCharge,
          limitedStartCharge: input.limitedStartCharge,
          permanentPulls: input.permanentPulls,
          limitedPulls: input.limitedPulls,
          pickupsObtained: input.pickupsObtained,
          threeStarCount: input.threeStarCount,
          rebateTicketsUsed: stats.value.rebateTicketsUsed,
        });
      } else {
        await createSession({
          recruitmentAccountId: accountId as Id<"recruitmentAccount">,
          name: name.trim(),
          date: date.getTime(),
          isFestBanner,
          permanentStartCharge: input.permanentStartCharge,
          limitedStartCharge: input.limitedStartCharge,
          permanentPulls: input.permanentPulls,
          limitedPulls: input.limitedPulls,
          pickupsObtained: input.pickupsObtained,
          threeStarCount: input.threeStarCount,
          rebateTicketsUsed: stats.value.rebateTicketsUsed,
        });
      }

      toast.success(t("tools.recruitment.toasts.sessionSaved"));
      router.push(`/user/recruitment/${accountId}`);
    } catch (error) {
      toast.error(getRecruitmentErrorMessage(error));
    }
  }

  async function remove() {
    if (!sessionId) {
      return;
    }

    try {
      await deleteSession({
        sessionId: sessionId as Id<"recruitmentSession">,
      });

      setDeleteDialogOpen(false);
      router.push(`/user/recruitment/${accountId}`);
    } catch (error) {
      toast.error(
        getErrorMessage(error) ||
          t("tools.recruitment.toasts.sessionDeleteFail"),
      );
    }
  }

  const actions = (
    <>
      <Button onClick={save} disabled={!stats.value || !name.trim()}>
        <SaveIcon />
        {t("common.saveChanges")}
      </Button>

      {sessionId && (
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2Icon />
          {t("common.delete")}
        </Button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 self-start text-muted-foreground"
        >
          <Link href={`/user/recruitment/${accountId}`}>
            <ChevronLeftIcon />
            {t("common.backTo", {
              destination: accountResult?.account.name ?? "",
            })}
          </Link>
        </Button>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">
            {sessionId
              ? t("tools.recruitment.editSession")
              : t("tools.recruitment.newSession")}
          </h1>

          <div className="flex gap-2 max-xl:hidden">{actions}</div>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          {!sessionId && (
            <Alert className="border-primary/50 bg-primary/10">
              <InfoIcon />

              <AlertTitle>
                {t("tools.recruitment.chronologicalTitle")}
              </AlertTitle>

              <AlertDescription>
                {t("tools.recruitment.chronologicalDescription")}
              </AlertDescription>
            </Alert>
          )}

          <FormSection title={t("tools.recruitment.sessionDetails")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="session-name">
                  {t("tools.recruitment.sessionName")}
                </Label>

                <Input
                  id="session-name"
                  placeholder={t("tools.recruitment.sessionNamePlaceholder")}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t("tools.recruitment.date")}</Label>

                <Popover
                  open={datePopoverOpen}
                  onOpenChange={setDatePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-between font-normal"
                    >
                      {format.dateTime(date, {
                        dateStyle: "medium",
                      })}
                      <CalendarIcon className="text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      captionLayout="dropdown"
                      onSelect={(selectedDate) => {
                        if (selectedDate) {
                          setDate(selectedDate);
                        }

                        setDatePopoverOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="session-fest"
                checked={isFestBanner}
                onCheckedChange={setIsFestBanner}
              />

              <Label htmlFor="session-fest" className="font-normal">
                {t("tools.recruitment.festBanner")}
              </Label>
            </div>
          </FormSection>

          <FormSection title={t("tools.recruitment.pullsSection")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <PoolFields
                kind="permanent"
                startCharge={permanentStartCharge}
                onStartChargeChange={setPermanentStartCharge}
                pulls={permanentPulls}
                onPullsChange={setPermanentPulls}
              />

              <PoolFields
                kind="limited"
                startCharge={limitedStartCharge}
                onStartChargeChange={setLimitedStartCharge}
                pulls={limitedPulls}
                onPullsChange={setLimitedPulls}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t("tools.recruitment.startChargeHint")}{" "}
              {t("tools.recruitment.totalPullsHint")}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="session-three-stars">
                  {t("tools.recruitment.threeStars")}
                </Label>

                <NumericInput
                  id="session-three-stars"
                  min={0}
                  value={threeStarCount}
                  onValueChange={setThreeStarCount}
                />

                <p className="text-xs text-muted-foreground">
                  {t("tools.recruitment.threeStarsHint")}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="session-tickets-used">
                  {t("tools.recruitment.ticketsUsed")}
                </Label>

                <NumericInput
                  id="session-tickets-used"
                  min={0}
                  value={
                    rebateTicketsUsed ?? stats.value?.rebateTicketsUsed ?? ""
                  }
                  onValueChange={setRebateTicketsUsed}
                />

                <p className="text-xs text-muted-foreground">
                  {t("tools.recruitment.ticketsUsedHint")}
                </p>
              </div>
            </div>
          </FormSection>

          <FormSection
            title={t("tools.recruitment.pickups")}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPickups([
                    ...pickups,
                    {
                      charge: "",
                      studentId: "",
                      calculated: true,
                      totalPulls: "",
                      chargeAfter: "",
                    },
                  ])
                }
              >
                <PlusIcon />
                {t("tools.recruitment.addPickup")}
              </Button>
            }
          >
            <p className="text-xs text-muted-foreground">
              {t("tools.recruitment.pickupsHint")}
            </p>

            {pickups.length === 0 && (
              <div className="text-sm text-muted-foreground">
                {t("tools.recruitment.noAcquisitions")}
              </div>
            )}

            {pickups.map((pickup, index) => {
              const resolved = resolvedCharges[index];

              const student = students.find(
                (item) => item.id === pickup.studentId,
              );

              return (
                <div
                  className="flex flex-col gap-3 rounded-md border p-3"
                  key={`${index}-${pickup.studentId}`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
                    <span className="hidden size-7 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground sm:grid">
                      {index + 1}
                    </span>

                    <StudentPicker
                      onStudentSelected={(selected) =>
                        updatePickup(index, {
                          studentId: selected.id,
                          kind: pickupPoolKind(selected),
                        })
                      }
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 w-full justify-start px-2"
                      >
                        {student ? (
                          <>
                            <img
                              src={buildStudentIconUrl(student)}
                              alt=""
                              className="size-10 rounded-full object-cover"
                            />

                            <span className="truncate">{student.name}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            {t("common.selectStudent")}
                          </span>
                        )}
                      </Button>
                    </StudentPicker>

                    <PickupPoolBadge kind={pickup.kind} />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("tools.recruitment.removePickup")}
                      onClick={() =>
                        setPickups(pickups.filter((_, i) => i !== index))
                      }
                    >
                      <XIcon />
                    </Button>
                  </div>

                  <div className="grid items-start gap-3 sm:grid-cols-3">
                    {pickup.calculated && (
                      <>
                        <div className="flex min-w-0 flex-col gap-1">
                          <Label className="text-xs text-muted-foreground">
                            {t("tools.recruitment.pickupTotalPulls", {
                              kind: pickup.kind ?? "unknown",
                            })}
                          </Label>

                          <NumericInput
                            min={1}
                            value={pickup.totalPulls ?? ""}
                            onValueChange={(totalPulls) =>
                              updatePickup(index, {
                                totalPulls,
                              })
                            }
                          />
                        </div>

                        <div className="flex min-w-0 flex-col gap-1">
                          <Label className="text-xs text-muted-foreground">
                            {t("tools.recruitment.pickupChargeAfter", {
                              kind: pickup.kind ?? "unknown",
                            })}
                          </Label>

                          <NumericInput
                            min={0}
                            max={200}
                            value={pickup.chargeAfter ?? ""}
                            onValueChange={(chargeAfter) =>
                              updatePickup(index, {
                                chargeAfter,
                              })
                            }
                          />
                        </div>
                      </>
                    )}

                    <div
                      className={cn(
                        "order-first flex min-w-0 flex-col gap-1 sm:order-none",
                        pickup.calculated && "sm:col-start-3",
                      )}
                    >
                      <Label className="text-xs text-muted-foreground">
                        {t("tools.recruitment.pickupCharge")}
                      </Label>

                      <div className="flex items-center gap-1">
                        {pickup.calculated ? (
                          <output className="flex h-9 min-w-0 flex-1 items-center rounded-md border border-dashed bg-muted/40 px-3 font-semibold tabular-nums">
                            {resolved?.status === "ok" ? resolved.charge : "—"}
                          </output>
                        ) : (
                          <NumericInput
                            aria-label={t("tools.recruitment.pickupCharge")}
                            className="min-w-0 flex-1"
                            min={1}
                            max={200}
                            value={pickup.charge}
                            onValueChange={(charge) =>
                              updatePickup(index, {
                                charge,
                              })
                            }
                          />
                        )}

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-muted-foreground"
                                aria-label={
                                  pickup.calculated
                                    ? t("tools.recruitment.pickupModeDirect")
                                    : t(
                                        "tools.recruitment.pickupModeCalculated",
                                      )
                                }
                                onClick={() =>
                                  updatePickup(
                                    index,
                                    pickup.calculated
                                      ? {
                                          calculated: false,
                                          // Keep the charge that was just worked out.
                                          charge:
                                            resolved?.status === "ok"
                                              ? resolved.charge
                                              : pickup.charge,
                                        }
                                      : {
                                          calculated: true,
                                        },
                                  )
                                }
                              >
                                {pickup.calculated ? (
                                  <PencilIcon />
                                ) : (
                                  <CalculatorIcon />
                                )}
                              </Button>
                            </TooltipTrigger>

                            <TooltipContent>
                              {pickup.calculated
                                ? t("tools.recruitment.pickupModeDirect")
                                : t("tools.recruitment.pickupModeCalculated")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>

                  {pickup.calculated && resolved?.status === "error" && (
                    <p className="text-sm text-destructive">
                      {t(PICKUP_CHARGE_ERROR_KEYS[resolved.error])}
                    </p>
                  )}
                </div>
              );
            })}
          </FormSection>
        </div>

        <aside className="flex flex-col gap-5 rounded-md border p-4 xl:sticky xl:top-16">
          <h2 className="font-semibold">{t("tools.recruitment.summary")}</h2>

          {stats.value ? (
            <>
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <ChargeGauge
                  kind="permanent"
                  label={t("tools.recruitment.permanentEndCharge")}
                  value={stats.value.permanentEndCharge}
                />

                <ChargeGauge
                  kind="limited"
                  label={t("tools.recruitment.limitedEndCharge")}
                  value={stats.value.limitedEndCharge}
                />
              </div>

              <PullComposition stats={stats.value} />

              <Readout
                className="border-t"
                items={[
                  {
                    label: t("tools.recruitment.pyroxenesSpent"),
                    value: stats.value.pyroxenesSpent.toLocaleString(),
                  },
                  {
                    label: t("tools.recruitment.pyroxenesSaved"),
                    value: stats.value.pyroxenesSaved.toLocaleString(),
                  },
                  {
                    label: t("tools.recruitment.ticketsUsed"),
                    value: stats.value.rebateTicketsUsed,
                  },
                  {
                    label: t("tools.recruitment.ticketsRemaining"),
                    value: stats.value.remainingRebateTickets,
                  },
                  {
                    label: t("tools.recruitment.experiencedThreeStarRate"),
                    value: `${stats.value.experiencedThreeStarRate.toFixed(2)}%`,
                  },
                  {
                    label: t("tools.recruitment.pullsPerThreeStar"),
                    value: stats.value.pullsPerThreeStar?.toFixed(2) ?? "—",
                  },
                  {
                    label: t("tools.recruitment.experiencedPURate"),
                    value: `${stats.value.experiencedPURate.toFixed(2)}%`,
                  },
                  {
                    label: t("tools.recruitment.pullsPerPU"),
                    value: stats.value.pullsPerPU?.toFixed(2) ?? "—",
                  },
                  {
                    label: t("tools.recruitment.softPity"),
                    value: `${stats.value.softPityWins}/${stats.value.softPityLosses}`,
                  },
                  {
                    label: t("tools.recruitment.hardPity"),
                    value: stats.value.hardPities,
                  },
                ]}
              />

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">
                  {t("tools.recruitment.acquisitions")}
                </h3>

                <Acquisitions stats={stats.value} />
              </div>
            </>
          ) : stats.error ? (
            <p className="text-sm text-destructive">
              {getRecruitmentErrorMessage(new Error(stats.error))}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("tools.recruitment.summaryPending")}
            </p>
          )}
        </aside>
      </div>

      <div className="flex gap-2 xl:hidden">{actions}</div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("tools.recruitment.confirmDeleteTitle")}
            </DialogTitle>

            <DialogDescription>
              {t("tools.recruitment.confirmDeleteDescription")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>

            <Button variant="destructive" onClick={remove}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t pt-4">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>

      {children}
    </section>
  );
}

function PoolFields({
  kind,
  startCharge,
  onStartChargeChange,
  pulls,
  onPullsChange,
}: {
  kind: RecruitmentKind;
  startCharge: NumericInputValue;
  onStartChargeChange: (value: NumericInputValue) => void;
  pulls: NumericInputValue;
  onPullsChange: (value: NumericInputValue) => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <PoolMark kind={kind} />
        {t(`tools.recruitment.${kind}`)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`session-${kind}-start`}>
            {t("tools.recruitment.startCharge")}
          </Label>

          <NumericInput
            id={`session-${kind}-start`}
            min={0}
            max={200}
            value={startCharge}
            onValueChange={onStartChargeChange}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`session-${kind}-pulls`}>
            {t("tools.recruitment.pulls")}
          </Label>

          <NumericInput
            id={`session-${kind}-pulls`}
            min={0}
            value={pulls}
            onValueChange={onPullsChange}
          />
        </div>
      </div>
    </div>
  );
}

function PickupPoolBadge({ kind }: { kind?: RecruitmentKind }) {
  const t = useTranslations();

  if (!kind) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <PoolMark kind={kind} />
      {t(`tools.recruitment.${kind}`)}
    </span>
  );
}
