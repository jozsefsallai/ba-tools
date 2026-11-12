import { readFileSync } from "node:fs";
import createMDX from "@next/mdx";
import withSerwistInit from "@serwist/next";
import { createNextYaakdoc } from "@yaakdoc/next";
import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";
import createNextIntlPlugin from "next-intl/plugin";
import { PVP_ICON_CATALOG_FORMAT } from "@/lib/pvp/icon-catalog-format";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  globPublicPatterns: [
    "icons/*",
    "apple-touch-icon.png",
  ],
  exclude: [
    /./,
  ],
  disable: process.env.NODE_ENV === "development",
});

const withNextIntl = createNextIntlPlugin();

const withYaakdoc = createNextYaakdoc({
  path: "/developers",
  export: "./docs/api/yaak.json",
  configFile: "./docs/api/yaakdoc.config.json",
});

const IMAGE_CDN_URL = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;

if (!IMAGE_CDN_URL) {
  throw new Error("NEXT_PUBLIC_IMAGE_CDN_URL is not set");
}

const url = new URL(IMAGE_CDN_URL);
const isDev = process.env.NODE_ENV === "development";

function originOf(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function clerkFrontendApiOrigin() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const encoded = key?.split("_")[2];
  if (!encoded) {
    return null;
  }

  const host = Buffer.from(encoded, "base64")
    .toString("utf8")
    .replace(/\$$/, "");

  return originOf(`https://${host}`);
}

const cdnOrigin = url.origin;
const convexOrigin = originOf(process.env.NEXT_PUBLIC_CONVEX_URL);
const clerkOrigin = clerkFrontendApiOrigin();
const turnstileOrigin = "https://challenges.cloudflare.com";
const unityGameOrigin = "https://cdn.nimblebun.works";

function csp(
  directives: Record<string, Array<string | null | undefined | false>>,
) {
  return Object.entries(directives)
    .map(([name, sources]) =>
      [
        name,
        ...sources.filter(Boolean),
      ].join(" "),
    )
    .join("; ");
}

const cspDirectives = {
  "default-src": [
    "'self'",
  ],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "'wasm-unsafe-eval'",
    "blob:",
    cdnOrigin,
    clerkOrigin,
    turnstileOrigin,
    unityGameOrigin,
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'",
  ],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https:",
  ],
  "font-src": [
    "'self'",
    "data:",
  ],
  "media-src": [
    "'self'",
    "blob:",
    "data:",
    cdnOrigin,
  ],
  "connect-src": [
    "'self'",
    "data:",
    "blob:",
    cdnOrigin,
    convexOrigin,
    convexOrigin?.replace(/^http/, "ws"),
    clerkOrigin,
    "https://clerk-telemetry.com",
    unityGameOrigin,
    isDev && "ws:",
  ],
  "frame-src": [
    "https://www.youtube.com",
    "https://player.bilibili.com",
    turnstileOrigin,
  ],
  "worker-src": [
    "'self'",
    "blob:",
  ],
  "object-src": [
    "'none'",
  ],
  "base-uri": [
    "'self'",
  ],
  "form-action": [
    "'self'",
  ],
  "frame-ancestors": [
    "'self'",
  ],
};

const planaCspDirectives = {
  ...cspDirectives,
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    cdnOrigin,
    "https://img.clerk.com",
  ],
};

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp(cspDirectives),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

const planaHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp(planaCspDirectives),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*": {
        condition: {
          query: /[?&]og-asset(?:&|$)/,
        },
        loaders: [
          "./scripts/loaders/og-asset.cjs",
        ],
        as: "*.js",
      },
      "*.glsl": {
        loaders: [
          "./scripts/loaders/glsl.cjs",
        ],
        as: "*.js",
      },
    },
  },

  webpack(config) {
    const assetQuery = /[?&]og-asset(?:&|$)/;

    for (const rule of config.module.rules) {
      if (rule?.loader === "next-image-loader") {
        rule.resourceQuery.not.push(assetQuery);
      }
    }

    config.module.rules.push({
      resourceQuery: assetQuery,
      type: "javascript/auto",
      use: [
        "./scripts/loaders/og-asset.cjs",
      ],
    });

    config.module.rules.push({
      test: /\.glsl$/,
      type: "javascript/auto",
      use: [
        "./scripts/loaders/glsl.cjs",
      ],
    });

    return config;
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // strict mode messes with the Spine renderer
  reactStrictMode: false,

  pageExtensions: [
    "js",
    "jsx",
    "md",
    "mdx",
    "ts",
    "tsx",
  ],

  images: {
    remotePatterns: [
      {
        protocol: url.protocol.replace(":", "") as any,
        hostname: url.hostname,
        port: url.port ?? "",
      },
    ],
  },

  serverExternalPackages: [
    "@resvg/resvg-js",
    "@napi-rs/image",
    "chromadb",
  ],

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
      ...[
        "",
        "/ja",
      ].flatMap((prefix) => [
        {
          source: `${prefix}/user/rosters`,
          destination: `${prefix}/rosters`,
          statusCode: 307 as const,
        },
        {
          source: `${prefix}/user/rosters/new`,
          destination: `${prefix}/rosters/new`,
          statusCode: 307 as const,
        },
        {
          source: `${prefix}/user/rosters/:rosterId`,
          destination: `${prefix}/rosters/edit/:rosterId`,
          statusCode: 307 as const,
        },
        {
          source: `${prefix}/user/recruitment/:path*`,
          destination: `${prefix}/recruitment-tracker/:path*`,
          statusCode: 307 as const,
        },
      ]),
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/plana-ai/:path*",
        headers: planaHeaders,
      },
      {
        source: "/ja/plana-ai/:path*",
        headers: planaHeaders,
      },
      {
        source: "/api/students",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
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
      {
        source: "/api/v1/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Authorization, Content-Type",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({});

export default async function configuration(
  phase: string,
  {
    defaultConfig,
  }: {
    defaultConfig: NextConfig;
  },
) {
  const config = {
    ...nextConfig,
  };

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

  return withYaakdoc(withSerwist(withNextIntl(withMDX(config))))(phase, {
    defaultConfig,
  });
}
