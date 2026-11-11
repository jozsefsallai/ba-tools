"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ChevronLeftIcon,
  InfoIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DatePicker,
  Field,
  FormSection,
  PoolFields,
} from "@/app/[locale]/user/recruitment/_components/fields";
import { PickupRow } from "@/app/[locale]/user/recruitment/_components/pickup-row";
import { SessionSummary } from "@/app/[locale]/user/recruitment/_components/session-summary";
import type { PickupDraft } from "@/app/[locale]/user/recruitment/_components/types";
import { MessageBox } from "@/components/common/message-box";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { Link, useRouter } from "@/i18n/navigation";
import { getErrorMessage } from "@/lib/convex-error";
import {
  calculateRecruitmentStats,
  normalizeRecruitmentSession,
  type RecruitmentSessionInput,
  type ResolvedPickupCharge,
  resolvePickupCharges,
} from "@/lib/recruitment";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

/** Fragments of the server's error messages, each with the translation shown for it. */
const SAVE_ERROR_KEYS = [
  [
    "Cannot recalculate",
    "tools.recruitment.errors.inconsistentHistory",
  ],
  [
    "chronological order",
    "tools.recruitment.errors.chronologicalOrder",
  ],
  [
    "Start charge must be",
    "tools.recruitment.errors.invalidStartCharge",
  ],
  [
    "Total pulls must be",
    "tools.recruitment.errors.invalidTotalPulls",
  ],
  [
    "3★ count",
    "tools.recruitment.errors.invalidThreeStarCount",
  ],
  [
    "Rebate tickets used",
    "tools.recruitment.errors.invalidTicketsUsed",
  ],
  [
    "Each pickup",
    "tools.recruitment.errors.invalidPickup",
  ],
  [
    "first pickup charge",
    "tools.recruitment.errors.firstPickupBelowStart",
  ],
  [
    "Pickup charges must",
    "tools.recruitment.errors.pickupsOutOfOrder",
  ],
  [
    "Pickup charges require",
    "tools.recruitment.errors.tooFewPulls",
  ],
] as const;

function saveErrorKey(error: unknown) {
  const message = getErrorMessage(error);
  const match = SAVE_ERROR_KEYS.find(([fragment]) =>
    message.includes(fragment),
  );

  return match?.[1] ?? "tools.recruitment.toasts.sessionSaveFail";
}

function numberOrUndefined(value: NumericInputValue | undefined) {
  return value === "" ? undefined : value;
}

const EMPTY_PICKUP: PickupDraft = {
  charge: "",
  studentId: "",
  calculated: true,
  totalPulls: "",
  chargeAfter: "",
};

type RecruitmentSessionEditorProps = {
  accountId: Id<"recruitmentAccount">;
  sessionId?: Id<"recruitmentSession">;
};

export function RecruitmentSessionEditor({
  accountId,
  sessionId,
}: RecruitmentSessionEditorProps) {
  const t = useTranslations();
  const router = useRouter();

  const accountResult = useQuery(api.recruitment.getAccount, {
    accountId,
  });

  const sessionResult = useQuery(
    api.recruitment.getSession,
    sessionId
      ? {
          sessionId,
        }
      : "skip",
  );

  const createSession = useMutation(api.recruitment.createSession);
  const updateSession = useMutation(api.recruitment.updateSession);
  const deleteSession = useMutation(api.recruitment.deleteSession);

  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date());
  const [isFestBanner, setIsFestBanner] = useState(false);
  const [permanentStartCharge, setPermanentStartCharge] =
    useState<NumericInputValue>(0);
  const [limitedStartCharge, setLimitedStartCharge] =
    useState<NumericInputValue>(0);
  const [permanentPulls, setPermanentPulls] = useState<NumericInputValue>(0);
  const [limitedPulls, setLimitedPulls] = useState<NumericInputValue>(0);
  const [threeStarCount, setThreeStarCount] = useState<NumericInputValue>(0);
  const [previousTickets, setPreviousTickets] = useState<NumericInputValue>(0);
  const [rebateTicketsUsed, setRebateTicketsUsed] =
    useState<NumericInputValue>();
  const [pickups, setPickups] = useState<PickupDraft[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const accountPath = `/user/recruitment/${accountId}`;

  useEffect(() => {
    if (sessionResult) {
      const normalized = normalizeRecruitmentSession(sessionResult);

      setName(sessionResult.name);
      setDate(new Date(sessionResult.date));
      setIsFestBanner(sessionResult.isFestBanner ?? false);
      setPermanentStartCharge(normalized.permanentStartCharge);
      setLimitedStartCharge(normalized.limitedStartCharge);
      setPermanentPulls(normalized.permanentPulls);
      setLimitedPulls(normalized.limitedPulls);
      setThreeStarCount(sessionResult.threeStarCount);
      setPreviousTickets(sessionResult.rebateTicketsFromPreviousSession);
      setRebateTicketsUsed(sessionResult.rebateTicketsUsed);
      setPickups(normalized.pickupsObtained);

      return;
    }

    if (accountResult && !sessionId) {
      const [latestSession] = accountResult.sessions;

      setPermanentStartCharge(accountResult.account.permanentCharge);
      setLimitedStartCharge(accountResult.account.limitedCharge);
      setPreviousTickets(latestSession?.stats.remainingRebateTickets ?? 0);
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

    // When only one banner type was pulled on, every pick-up came from it.
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

  /** The session as entered, or `null` while a field is empty or a charge is unresolved. */
  const input = useMemo<RecruitmentSessionInput | null>(() => {
    const charges = resolvedCharges.flatMap((resolved) =>
      resolved.status === "ok"
        ? [
            resolved.charge,
          ]
        : [],
    );

    if (
      permanentStartCharge === "" ||
      limitedStartCharge === "" ||
      permanentPulls === "" ||
      limitedPulls === "" ||
      threeStarCount === "" ||
      previousTickets === "" ||
      rebateTicketsUsed === "" ||
      charges.length !== pickups.length
    ) {
      return null;
    }

    const session = {
      permanentStartCharge,
      limitedStartCharge,
      permanentPulls,
      limitedPulls,
      threeStarCount,
      rebateTicketsFromPreviousSession: previousTickets,
      rebateTicketsUsed,
      isFestBanner,
    };

    const pickupsObtained = pickups.map((pickup, index) => ({
      charge: charges[index],
      studentId: pickup.studentId,
      kind: pickup.kind,
    }));

    try {
      return normalizeRecruitmentSession({
        ...session,
        pickupsObtained,
      });
    } catch {
      // A pick-up without a student has no banner type yet. Count it as
      // permanent so the rest of the session can still be checked.
      return {
        ...session,
        pickupsObtained: pickupsObtained.map((pickup) => ({
          ...pickup,
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
        error,
      };
    }
  }, [
    input,
  ]);

  if (
    accountResult === undefined ||
    (sessionId && sessionResult === undefined)
  ) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (sessionId && !sessionResult) {
    return <MessageBox>{t("tools.recruitment.failedToLoad")}</MessageBox>;
  }

  const canSave = stats.value !== null && name.trim() !== "";

  function addPickup() {
    setPickups([
      ...pickups,
      EMPTY_PICKUP,
    ]);
  }

  function updatePickup(index: number, patch: Partial<PickupDraft>) {
    setPickups(
      pickups.map((pickup, i) =>
        i === index
          ? {
              ...pickup,
              ...patch,
            }
          : pickup,
      ),
    );
  }

  function removePickup(index: number) {
    setPickups(pickups.filter((_, i) => i !== index));
  }

  async function save() {
    if (!stats.value || !input || !name.trim()) {
      return;
    }

    const session = {
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
    };

    try {
      if (sessionId) {
        await updateSession({
          sessionId,
          ...session,
        });
      } else {
        await createSession({
          recruitmentAccountId: accountId,
          ...session,
        });
      }

      toast.success(t("tools.recruitment.toasts.sessionSaved"));
      router.push(accountPath);
    } catch (error) {
      toast.error(t(saveErrorKey(error)));
    }
  }

  async function remove() {
    if (!sessionId) {
      return;
    }

    try {
      await deleteSession({
        sessionId,
      });

      setDeleteDialogOpen(false);
      router.push(accountPath);
    } catch (error) {
      toast.error(
        getErrorMessage(error) ||
          t("tools.recruitment.toasts.sessionDeleteFail"),
      );
    }
  }

  const actions = (
    <>
      <Button onClick={save} disabled={!canSave}>
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
          <Link href={accountPath}>
            <ChevronLeftIcon />
            {t("common.backTo", {
              destination: accountResult.account.name,
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
              <Field
                label={t("tools.recruitment.sessionName")}
                htmlFor="session-name"
              >
                <Input
                  id="session-name"
                  placeholder={t("tools.recruitment.sessionNamePlaceholder")}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>

              <Field label={t("tools.recruitment.date")}>
                <DatePicker value={date} onChange={setDate} />
              </Field>
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
              <Field
                label={t("tools.recruitment.threeStars")}
                htmlFor="session-three-stars"
                hint={t("tools.recruitment.threeStarsHint")}
              >
                <NumericInput
                  id="session-three-stars"
                  min={0}
                  value={threeStarCount}
                  onValueChange={setThreeStarCount}
                />
              </Field>

              <Field
                label={t("tools.recruitment.ticketsUsed")}
                htmlFor="session-tickets-used"
                hint={t("tools.recruitment.ticketsUsedHint")}
              >
                <NumericInput
                  id="session-tickets-used"
                  min={0}
                  value={
                    rebateTicketsUsed ?? stats.value?.rebateTicketsUsed ?? ""
                  }
                  onValueChange={setRebateTicketsUsed}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title={t("tools.recruitment.pickups")}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPickup}
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
              <p className="text-sm text-muted-foreground">
                {t("tools.recruitment.noAcquisitions")}
              </p>
            )}

            {pickups.map((pickup, index) => (
              <PickupRow
                key={`${index}-${pickup.studentId}`}
                index={index}
                pickup={pickup}
                resolved={resolvedCharges[index]}
                onChange={(patch) => updatePickup(index, patch)}
                onRemove={() => removePickup(index)}
              />
            ))}
          </FormSection>
        </div>

        <SessionSummary
          stats={stats.value}
          error={stats.error ? t(saveErrorKey(stats.error)) : undefined}
        />
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
