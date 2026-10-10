import "server-only";

import { buildCDNAbsoluteUrl } from "@/lib/url";

// Resolve remote artwork before rendering so a missing asset cannot break the
// card
export async function fetchOgArtwork(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (
      !response.ok ||
      !response.headers.get("content-type")?.startsWith("image/")
    ) {
      return undefined;
    }

    return `data:${response.headers.get("content-type")};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  } catch {
    return undefined;
  }
}

export function studentIcon(id: string) {
  return buildCDNAbsoluteUrl(
    `v2/images/students/icons/${encodeURIComponent(id)}.png`,
  );
}
