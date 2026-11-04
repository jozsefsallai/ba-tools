import {
  getRaidValidationError,
  type RaidInfo,
  type RaidInfoScope,
} from "@/lib/raid-info";
import { invalid } from "./errors";

export function assertValidRaid(
  raid: RaidInfo | null | undefined,
  scope: RaidInfoScope,
) {
  if (!raid) {
    return;
  }

  const error = getRaidValidationError(raid, scope);
  if (error) {
    throw invalid(error);
  }
}
