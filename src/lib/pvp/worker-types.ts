import type { PvpPixelImage } from "@/lib/pvp";
import type { PvpIconCatalog } from "@/lib/pvp/icon-match";

export type PvpWorkerResponse<T> =
  | { result: T; error?: never }
  | { error: string; result?: never };

export type PvpIconWorkerRequest =
  | { kind: "init"; catalog: PvpIconCatalog; templates: Uint8Array }
  | { kind: "match"; images: PvpPixelImage[]; allowedIds?: string[] };
