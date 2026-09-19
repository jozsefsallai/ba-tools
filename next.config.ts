import createMDX from "@next/mdx";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

  serverExternalPackages: ["@resvg/resvg-js", "chromadb"],

  async redirects() {
    return [
      {
        source: "/aoba-railing-simulator",
        destination: "/railroad-puzzle-solver",
        statusCode: 307,
      },
      {
        source: "/timelines",
        destination: "/timeline-visualizer",
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

export default withSerwist(withNextIntl(withMDX(nextConfig)));
