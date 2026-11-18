import { type Task, task } from "@trigger.dev/sdk";
import { getAnnouncementText } from "./lib/aronabot/announcement";
import { setBanners } from "./lib/aronabot/set-banners";
import type { SetBannersPayload } from "./schemas";

// Replaces the banners of both regions by hand and returns the announcement,
// without posting it or resetting anything. `aronabot-sync-banners` does all of
// that from the `GameBanner` table.
export const setBannersTask: Task<
  "aronabot-set-banners",
  SetBannersPayload,
  string
> = task({
  id: "aronabot-set-banners",
  run: async ({ banners }: SetBannersPayload) => {
    const now = new Date();

    const saved = await setBanners(
      [
        "Global",
        "JP",
      ],
      banners,
      now,
    );

    return getAnnouncementText(saved, now);
  },
});
