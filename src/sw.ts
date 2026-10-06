/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => {
        return (
          url.origin === self.location.origin &&
          url.pathname.startsWith("/ocr/")
        );
      },
      handler: new CacheFirst({ cacheName: "pvp-ocr-assets" }),
    },
    {
      matcher: ({ url }) => {
        return (
          url.origin === self.location.origin &&
          url.pathname === "/pvp-icons/manifest.json"
        );
      },
      handler: new NetworkFirst({
        cacheName: "pvp-icon-manifest",
        networkTimeoutSeconds: 5,
        plugins: [new ExpirationPlugin({ maxEntries: 1 })],
      }),
    },
    {
      matcher: ({ url }) => {
        return (
          url.origin === self.location.origin &&
          /^\/pvp-icons\/[a-f0-9]{16}\.bin$/.test(url.pathname)
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
