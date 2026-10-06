import assets from "@/lib/pvp/ocr-assets.json";
import { buildCDNUrl } from "@/lib/url";

export const PVP_OCR_CORE_VARIANTS = [
  "lstm",
  "simd-lstm",
  "relaxedsimd-lstm",
] as const;

export function getPvpOcrAssetFilenames() {
  return [
    "worker.min.js",
    "TESSERACT-LICENSE",
    "worker.min.js.LICENSE.txt",
    "CORE-LICENSE",
    ...PVP_OCR_CORE_VARIANTS.flatMap((variant) =>
      ["wasm", "wasm.js"].map(
        (extension) => `core/tesseract-core-${variant}.${extension}`,
      ),
    ),
    ...assets.languages.map((language) => `lang/${language}.traineddata.gz`),
    "manifest.json",
  ];
}

function getPvpRecognitionAssetBaseUrl() {
  if (!process.env.NEXT_PUBLIC_IMAGE_CDN_URL) {
    throw new Error("NEXT_PUBLIC_IMAGE_CDN_URL is not set");
  }

  return new URL(buildCDNUrl("v2/ocr/"));
}

export function getPvpOcrAssetBaseUrl() {
  return new URL(`${assets.version}/`, getPvpRecognitionAssetBaseUrl());
}

export function getPvpIconAssetBaseUrl() {
  return new URL("pvp-icons/", getPvpRecognitionAssetBaseUrl());
}

export function getPvpIconCatalogUrl() {
  const version = process.env.NEXT_PUBLIC_PVP_ICON_VERSION;

  if (!version || !/^[a-f0-9]{16}$/.test(version)) {
    throw new Error("PvP icon catalog version is missing or invalid");
  }

  return new URL(`${version}.json`, getPvpIconAssetBaseUrl());
}
