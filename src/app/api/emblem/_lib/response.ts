const EMBLEM_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400";

export function createEmblemResponse(
  output: string | Uint8Array,
  png: boolean,
) {
  return new Response(
    typeof output === "string" ? output : (output.buffer as ArrayBuffer),
    {
      headers: {
        "Cache-Control": EMBLEM_CACHE_CONTROL,
        "Content-Type": png ? "image/png" : "image/svg+xml",
      },
    },
  );
}
