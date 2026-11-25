import {
  ITEM_ICON_CATALOG_FORMAT,
  type ItemIconCatalog,
} from "@/lib/inventory-scan/catalog-format";
import { buildCDNUrl } from "@/lib/url";

function getAssetBaseUrl() {
  return process.env.NODE_ENV === "development"
    ? new URL("/api/inventory-scan/icon-assets/", window.location.origin)
    : new URL(buildCDNUrl("v2/ocr/item-icons/"));
}

export async function loadItemIconCatalog() {
  const version = process.env.NEXT_PUBLIC_ITEM_ICON_VERSION;
  const base = getAssetBaseUrl();

  const manifest = await fetch(new URL(`${version}.json`, base));

  if (!manifest.ok) {
    throw new Error("Unable to load the item icon catalog");
  }

  const catalog: ItemIconCatalog = await manifest.json();

  if (
    catalog.format !== ITEM_ICON_CATALOG_FORMAT ||
    !/^[a-f0-9]{16}\.bin$/.test(catalog.asset)
  ) {
    throw new Error("Invalid item icon catalog");
  }

  const response = await fetch(new URL(catalog.asset, base));

  if (!response.ok || !response.body) {
    throw new Error("Unable to load the item icons");
  }

  const templates = new Uint8Array(
    await new Response(
      response.body.pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer(),
  );

  return {
    catalog,
    templates,
  };
}
