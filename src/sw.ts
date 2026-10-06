/// <reference lib="webworker" />

import {
  getPvpIconAssetBaseUrl,
  getPvpIconCatalogUrl,
  getPvpOcrAssetBaseUrl,
} from "@/lib/pvp/ocr-asset-url";
import { defaultCache } from "@serwist/next/worker";
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  Serwist,
} from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const ocrAssetUrl = getPvpOcrAssetBaseUrl();
const iconAssetUrl = getPvpIconAssetBaseUrl();
const iconCatalogUrl = getPvpIconCatalogUrl();

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
        plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
      }),
    },
    {
      matcher: ({ url }) => {
        return url.href === iconCatalogUrl.href;
      },
      handler: new CacheFirst({
        cacheName: "pvp-icon-manifest",
        plugins: [new ExpirationPlugin({ maxEntries: 4 })],
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
        plugins: [new ExpirationPlugin({ maxEntries: 4 })],
      }),
    },
    ...defaultCache,
  ],
});
serwist.addEventListeners();
