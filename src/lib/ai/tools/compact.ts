const DROPPED_KEYS = new Set([
  "iconUrl",
  "portraitUrl",
  "iconName",
  "searchTags",
  "devName",
  "matchScore",
  "schaleDbId",
  "createdAt",
  "updatedAt",
  "lastUpdated",
  "exportBackgroundColor",
  "exportBackgroundOpacity",
  "exportWithTransparentBackground",
  "exportIncludeFormation",
  "pickupChargeHistogram",
]);

const DEFAULT_MAX_CHARS = 16_000;

function strip(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(strip);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  const out: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(value)) {
    if (!DROPPED_KEYS.has(key) && child !== null && child !== undefined) {
      out[key] = strip(child);
    }
  }

  return out;
}

function findLongestArray(value: unknown): unknown[] | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const children = Array.isArray(value) ? value : Object.values(value);
  let longest = Array.isArray(value) ? value : null;

  for (const child of children) {
    const candidate = findLongestArray(child);

    if (candidate && candidate.length > (longest?.length ?? 0)) {
      longest = candidate;
    }
  }

  return longest;
}

export function compactForModel(
  value: unknown,
  maxChars = DEFAULT_MAX_CHARS,
): unknown {
  const stripped = strip(value);
  let truncated = false;

  while (JSON.stringify(stripped ?? null).length > maxChars) {
    const longest = findLongestArray(stripped);

    if (!longest || longest.length <= 1) {
      break;
    }

    longest.length = Math.ceil(longest.length / 2);
    truncated = true;
  }

  return truncated
    ? {
        result: stripped,
        truncated:
          "Some list entries were left out to save space. Never send this list back in an update, because the missing entries would be deleted.",
      }
    : stripped;
}
