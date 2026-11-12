"use client";

import { CalculatorIcon, PencilIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PoolMark } from "@/app/[locale]/recruitment-tracker/_components/shared";
import type { PickupDraft } from "@/app/[locale]/recruitment-tracker/_components/types";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStudents } from "@/hooks/use-students";
import {
  HARD_PITY,
  type PickupChargeError,
  pickupPoolKind,
  type ResolvedPickupCharge,
} from "@/lib/recruitment";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

const CHARGE_ERROR_KEYS = {
  outOfOrder: "tools.recruitment.errors.pickupTotalOutOfOrder",
  exceedsSessionPulls: "tools.recruitment.errors.pickupTotalExceedsSession",
  noPullsLeft: "tools.recruitment.errors.pickupNoPullsLeft",
  aboveHardPity: "tools.recruitment.errors.pickupAboveHardPity",
  invalidNumbers: "tools.recruitment.errors.pickupInvalidNumbers",
} as const satisfies Record<PickupChargeError, string>;

type PickupRowProps = {
  index: number;
  pickup: PickupDraft;
  resolved: ResolvedPickupCharge;
  onChange: (patch: Partial<PickupDraft>) => void;
  onRemove: () => void;
};

export function PickupRow({
  index,
  pickup,
  resolved,
  onChange,
  onRemove,
}: PickupRowProps) {
  const t = useTranslations();
  const { studentMap } = useStudents();

  const student = studentMap[pickup.studentId];
  const kind = pickup.kind ?? "unknown";

  const modeLabel = pickup.calculated
    ? t("tools.recruitment.pickupModeDirect")
    : t("tools.recruitment.pickupModeCalculated");

  function toggleMode() {
    if (!pickup.calculated) {
      onChange({
        calculated: true,
      });

      return;
    }

    onChange({
      calculated: false,
      // Keep the charge that was just worked out.
      charge: resolved.status === "ok" ? resolved.charge : pickup.charge,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
        <span className="hidden size-7 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground sm:grid">
          {index + 1}
        </span>

        <StudentPicker
          onStudentSelected={(selected) =>
            onChange({
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

        {pickup.kind && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <PoolMark kind={pickup.kind} />
            {t(`tools.recruitment.${pickup.kind}`)}
          </span>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("tools.recruitment.removePickup")}
          onClick={onRemove}
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
                  kind,
                })}
              </Label>

              <NumericInput
                min={1}
                value={pickup.totalPulls ?? ""}
                onValueChange={(totalPulls) =>
                  onChange({
                    totalPulls,
                  })
                }
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                {t("tools.recruitment.pickupChargeAfter", {
                  kind,
                })}
              </Label>

              <NumericInput
                min={0}
                max={HARD_PITY}
                value={pickup.chargeAfter ?? ""}
                onValueChange={(chargeAfter) =>
                  onChange({
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
                {resolved.status === "ok" ? resolved.charge : "—"}
              </output>
            ) : (
              <NumericInput
                aria-label={t("tools.recruitment.pickupCharge")}
                className="min-w-0 flex-1"
                min={1}
                max={HARD_PITY}
                value={pickup.charge}
                onValueChange={(charge) =>
                  onChange({
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
                    aria-label={modeLabel}
                    onClick={toggleMode}
                  >
                    {pickup.calculated ? <PencilIcon /> : <CalculatorIcon />}
                  </Button>
                </TooltipTrigger>

                <TooltipContent>{modeLabel}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {pickup.calculated && resolved.status === "error" && (
        <p className="text-sm text-destructive">
          {t(CHARGE_ERROR_KEYS[resolved.error])}
        </p>
      )}
    </div>
  );
}
