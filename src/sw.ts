/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type {
  PrecacheEntry,
  RouteMatchCallbackOptions,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  Serwist,
} from "serwist";
import {
  getPvpIconAssetBaseUrl,
  getPvpIconCatalogUrl,
  getPvpOcrAssetBaseUrl,
} from "@/lib/pvp/ocr-asset-url";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const ocrAssetUrl = getPvpOcrAssetBaseUrl();
const iconAssetUrl = getPvpIconAssetBaseUrl();
const iconCatalogUrl = getPvpIconCatalogUrl();

const workerOrigins = new Set([
  self.location.origin,
  ocrAssetUrl.origin,
  iconAssetUrl.origin,
]);

function matchesEntry(
  matcher: RuntimeCaching["matcher"],
  options: RouteMatchCallbackOptions,
) {
  if (typeof matcher === "function") {
    return Boolean(matcher(options));
  }

  if (matcher instanceof RegExp) {
    const match = matcher.exec(options.url.href);
    return Boolean(match) && (options.sameOrigin || match?.index === 0);
  }

  return options.url.href === new URL(matcher, self.location.href).href;
}

const ownOriginCache: RuntimeCaching[] = defaultCache.map((entry) => ({
  ...entry,
  matcher: (options) =>
    workerOrigins.has(options.url.origin) &&
    matchesEntry(entry.matcher, options),
}));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => {
        return (
          url.origin === ocrAssetUrl.origin &&
          url.pathname.startsWith(ocrAssetUrl.pathname)
        );
      },
      handler: new CacheFirst({
        cacheName: "pvp-ocr-assets",
        plugins: [
          new CacheableResponsePlugin({
            statuses: [
              0,
              200,
            ],
          }),
        ],
      }),
    },
    {
      matcher: ({ url }) => {
        return url.href === iconCatalogUrl.href;
      },
      handler: new CacheFirst({
        cacheName: "pvp-icon-manifest",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
          }),
        ],
      }),
    },
    {
      matcher: ({ url }) => {
        return (
          url.origin === iconAssetUrl.origin &&
          url.pathname.startsWith(iconAssetUrl.pathname) &&
          /^[a-f0-9]{16}\.bin$/.test(
            url.pathname.slice(iconAssetUrl.pathname.length),
          )
        );
      },
      handler: new CacheFirst({
        cacheName: "pvp-icon-templates",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
          }),
        ],
      }),
    },
    ...ownOriginCache,
  ],
});
serwist.addEventListeners();
