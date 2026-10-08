import { readFileSync } from "node:fs";
import { PVP_ICON_CATALOG_FORMAT } from "@/lib/pvp/icon-catalog-format";
import createMDX from "@next/mdx";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const withNextIntl = createNextIntlPlugin();

const IMAGE_CDN_URL = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;

if (!IMAGE_CDN_URL) {
  throw new Error("NEXT_PUBLIC_IMAGE_CDN_URL is not set");
}

const url = new URL(IMAGE_CDN_URL);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // strict mode messes with the Spine renderer
  reactStrictMode: false,

  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],

  images: {
    remotePatterns: [
      {
        protocol: url.protocol.replace(":", "") as any,
        hostname: url.hostname,
        port: url.port ?? "",
      },
    ],
  },

  serverExternalPackages: ["@resvg/resvg-js", "@napi-rs/image", "chromadb"],

  async redirects() {
    return [
      {
        source: "/aoba-railing-simulator",
        destination: "/railroad-puzzle-solver",
        statusCode: 307,
      },
      {
        source: "/ja/aoba-railing-simulator",
        destination: "/ja/railroad-puzzle-solver",
        statusCode: 307,
      },
      {
        source: "/timelines",
        destination: "/timeline-visualizer",
        statusCode: 307,
      },
      {
        source: "/ja/timelines",
        destination: "/ja/timeline-visualizer",
        statusCode: 307,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/api/students",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({});

export default function configuration(phase: string) {
  const config = { ...nextConfig };

  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_DEVELOPMENT_SERVER) {
    const iconCatalog = JSON.parse(
      readFileSync(".cache/pvp-ocr/v2/ocr/pvp-icons/manifest.json", "utf8"),
    );

    if (
      iconCatalog.format !== PVP_ICON_CATALOG_FORMAT ||
      !/^[a-f0-9]{16}\.bin$/.test(iconCatalog.asset)
    ) {
      throw new Error("Invalid PvP icon catalog; run pnpm run ocr:assets");
    }

    config.env = {
      NEXT_PUBLIC_PVP_ICON_VERSION: iconCatalog.asset.slice(0, -4),
    };
  }

  return withSerwist(withNextIntl(withMDX(config)));
}
