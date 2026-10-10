import "server-only";

import {
  getCardContent,
  ogLocale,
  sharingMetadata,
} from "@/lib/og-metadata.server";
import { OG_DESIGN_VERSION } from "@/lib/og/registry";
import { boundedText } from "@/lib/og/text";
import { fetchQuery } from "convex/nextjs";
import { getTranslations } from "next-intl/server";
import removeMd from "remove-markdown";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export async function getPublicTimelineMetadata(
  kind: "timeline" | "timeline-group",
  id: string,
  locale: string,
) {
  const language = ogLocale(locale);

  // Anonymous queries preserve public visibility checks without exposing
  // private records
  const record =
    kind === "timeline"
      ? await fetchQuery(api.timeline.getById, { id: id as Id<"timeline"> })
      : await fetchQuery(api.timelineGroup.getById, {
          id: id as Id<"timelineGroup">,
        });

  if (record.visibility !== "public") {
    throw new Error("Not found");
  }

  const card = await getCardContent("timeline-visualizer", language);
  const t = await getTranslations({ locale: language });
  const isGroup = kind === "timeline-group";
  const fallbackTitle = t(
    isGroup ? "common.untitledTimelineGroup" : "common.untitledTimeline",
  );
  const fallbackDescription = t(
    isGroup
      ? "common.sharing.timelineGroupDescription"
      : "common.sharing.timelineDescription",
  );

  const title = record.name?.replace(/\s+/g, " ").trim() || fallbackTitle;

  const description =
    boundedText(removeMd(record.description ?? ""), 160) || fallbackDescription;

  return sharingMetadata({
    title: t("common.sharing.title", { title, appName: t("common.appName") }),
    description,
    locale: language,
    image: `/api/og/${language}/timeline-visualizer?v=${OG_DESIGN_VERSION}`,
    alt: card.title,
  });
}
