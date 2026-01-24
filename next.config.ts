import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const IMAGE_CDN_URL = process.env.IMAGE_CDN_URL;

if (!IMAGE_CDN_URL) {
  throw new Error("IMAGE_CDN_URL is not set");
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

  async rewrites() {
    return [
      {
        source: "/cdn/:path*",
        destination: `${IMAGE_CDN_URL}/:path*`,
      },
    ];
  },

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

export default withMDX(nextConfig);
