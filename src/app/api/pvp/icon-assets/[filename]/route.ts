import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PvpIconCatalog } from "@/lib/pvp/icon-match";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const { filename } = await params;
  if (!/^[a-f0-9]{16}\.(json|bin)$/.test(filename)) {
    return new Response(null, { status: 404 });
  }

  const directory = join(process.cwd(), ".cache/pvp-ocr/v2/ocr/pvp-icons");
  const manifest = filename.endsWith(".json");

  try {
    const body = await readFile(
      join(directory, manifest ? "manifest.json" : filename),
    );

    if (manifest) {
      const catalog: PvpIconCatalog = JSON.parse(body.toString());

      if (catalog.asset !== filename.replace(/\.json$/, ".bin")) {
        return new Response(null, { status: 404 });
      }
    }

    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": manifest
          ? "application/json"
          : "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response(null, { status: 404 });
    }

    throw error;
  }
}
