import type { FunctionReturnType } from "convex/server";
import type { NumericInputValue } from "@/components/ui/numeric-input";
import type { RecruitmentKind } from "@/lib/recruitment";
import type { api } from "~convex/api";

/** An account with its sessions, as `api.recruitment.getAccount` returns it. */
export type AccountWithSessions = FunctionReturnType<
  typeof api.recruitment.getAccount
>;

export type Account = AccountWithSessions["account"];
export type SessionWithStats = AccountWithSessions["sessions"][number];

/** A pick-up while it is being edited, when its fields can still be empty. */
export type PickupDraft = {
  studentId: string;
  kind?: RecruitmentKind;
  charge: NumericInputValue;
  /** When set, the charge is worked out from `totalPulls` and `chargeAfter`. */
  calculated?: boolean;
  totalPulls?: NumericInputValue;
  chargeAfter?: NumericInputValue;
};
