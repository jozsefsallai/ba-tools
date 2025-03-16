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

  async rewrites() {
    return [
      {
        source: "/cdn/:path*",
        destination: `${IMAGE_CDN_URL}/:path*`,
      },
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
