import { createHash } from "node:crypto";

/** Site launch anchor — counter grows from here. */
const EPOCH_MS = Date.UTC(2019, 5, 15);

/** Base “starting” hit count for the Geocities vibe. */
const BASE_VISITS = 38_472;

/**
 * Deterministic pseudo–hit counter: drifts up over days/hours and picks up a
 * few digits from a request fingerprint so repeat visitors don’t all see the
 * same number.
 */
export function computeVisitorCount(now: Date, fingerprint: string): number {
  const t = now.getTime();
  const daysSinceEpoch = Math.floor((t - EPOCH_MS) / 86_400_000);
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const dow = now.getUTCDay();

  const dailyWave = daysSinceEpoch * 41;
  const hourlyBump = hour * 7 + Math.floor(minute / 10) * 2;
  const weekendGlow = dow === 0 || dow === 6 ? 1337 : 0;

  const hash = createHash("sha256").update(fingerprint).digest();
  const fpLow = hash.readUInt32BE(0);
  const fpNoise = (fpLow % 2_147) + Math.floor((fpLow >> 8) % 500);

  const raw = BASE_VISITS + dailyWave + hourlyBump + weekendGlow + fpNoise;

  return Math.min(99_999_999, Math.max(1, raw));
}

export function formatVisitorCount(n: number): string {
  return String(n).padStart(8, "0");
}

export function buildRequestFingerprint(headerStore: {
  get(name: string): string | null;
}): string {
  const forwarded = headerStore.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() ?? "unknown";
  const ua = headerStore.get("user-agent") ?? "";
  const lang = headerStore.get("accept-language") ?? "";
  return `${ip}|${ua}|${lang}`;
}
