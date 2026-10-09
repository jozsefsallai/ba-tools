"use client";

import { usePathname } from "@/i18n/navigation";
import type { PageBreadcrumb } from "@/lib/breadcrumbs";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type BreadcrumbInfo = {
  label: string;
  group?: string;
  href: string;
};

function useToolBreadcrumb(): BreadcrumbInfo | null {
  const t = useTranslations();
  const pathname = usePathname();

  return useMemo(() => {
    const PATH_LABELS: Record<
      string,
      { label: string; group?: string; href?: string }
    > = {
      "/bond": {
        label: t("common.header.nav.gameplay.bond"),
        group: t("common.header.nav.gameplay.title"),
      },
      "/timeline-visualizer": {
        label: t("common.header.nav.gameplay.timelineVisualizer"),
        group: t("common.header.nav.gameplay.title"),
      },
      "/inventory-management": {
        label: t("common.header.nav.gameplay.inventoryManagement"),
        group: t("common.header.nav.gameplay.title"),
      },
      "/railroad-puzzle-solver": {
        label: t("common.header.nav.gameplay.railroadPuzzleSolver"),
        group: t("common.header.nav.gameplay.title"),
      },
      "/raid-score-calculator": {
        label: t("common.header.nav.gameplay.raidScore"),
        group: t("common.header.nav.gameplay.title"),
      },
      "/student-exp-calculator": {
        label: t("common.header.nav.gameplay.studentExp"),
        group: t("common.header.nav.gameplay.title"),
      },
      "/pvp/search": {
        label: t("common.header.nav.gameplay.pvpSearch"),
        group: t("common.header.nav.gameplay.title"),
      },
      "/pvp": {
        label: t("common.header.nav.gameplay.pvp"),
        group: t("common.header.nav.gameplay.title"),
      },
      "/formation-display": {
        label: t("common.header.nav.misc.formationDisplay"),
        group: t("common.header.nav.misc.title"),
      },
      "/user/rosters": {
        label: t("common.header.nav.misc.roster"),
        group: t("common.header.nav.misc.title"),
      },
      "/rosters/": {
        label: t("common.header.nav.misc.roster"),
        group: t("common.header.nav.misc.title"),
        href: "/user/rosters",
      },
      "/title-generator": {
        label: t("common.header.nav.misc.titleGenerator"),
        group: t("common.header.nav.misc.title"),
      },
      "/gacha-rate-stats": {
        label: t("common.header.nav.misc.gachaRateStats"),
        group: t("common.header.nav.misc.title"),
      },
      "/scenario-image-generator": {
        label: t("common.header.nav.misc.scenarioImageGenerator"),
        group: t("common.header.nav.misc.title"),
      },
      "/global/banners": {
        label: t("common.header.nav.resouces.glBanners"),
        group: t("common.header.nav.resouces.title"),
      },
      "/games/flappy-peroro": {
        label: t("common.header.nav.games.flappyPeroro"),
        group: t("common.header.nav.games.title"),
      },
      "/timelines/g/": {
        label: t("common.header.nav.gameplay.timelineVisualizer"),
        group: t("common.header.nav.gameplay.title"),
        href: "/timeline-visualizer",
      },
      "/timelines/": {
        label: t("common.header.nav.gameplay.timelineVisualizer"),
        group: t("common.header.nav.gameplay.title"),
        href: "/timeline-visualizer",
      },
      "/user/formations": { label: "My Formations" },
      "/user/timelines": { label: "My Timelines" },
      "/credits": { label: "Credits" },
      "/changelog": { label: "Changelog" },
    };

    const match = Object.entries(PATH_LABELS).find(([path]) =>
      pathname.startsWith(path),
    );

    if (!match) {
      return null;
    }

    const [path, { label, group, href }] = match;
    return { label, group, href: href ?? path };
  }, [pathname, t]);
}

function extractTimelineIdFromPath(pathname: string): string | null {
  const singleMatch = pathname.match(/^\/timelines\/([^/]+)$/);

  if (singleMatch) {
    return singleMatch[1];
  }

  return null;
}

function extractTimelineGroupIdFromPath(pathname: string): string | null {
  const groupMatch = pathname.match(/^\/timelines\/g\/([^/]+)$/);

  if (groupMatch) {
    return groupMatch[1];
  }

  return null;
}

function useEditingItemName(): string | null {
  const t = useTranslations();

  const pathname = usePathname();

  const searchParams = useSearchParams();
  const searchId = searchParams.get("id");

  const isEditingTimeline = pathname === "/timeline-visualizer" && !!searchId;
  const isEditingFormation = pathname === "/formation-display" && !!searchId;

  const viewingTimelineId = extractTimelineIdFromPath(pathname);
  const viewingGroupId = extractTimelineGroupIdFromPath(pathname);

  const editingTimeline = useQuery(
    api.timeline.getOwnById,
    isEditingTimeline ? { id: searchId as Id<"timeline"> } : "skip",
  );

  const editingFormation = useQuery(
    api.formation.getById,
    isEditingFormation ? { id: searchId as Id<"formation"> } : "skip",
  );

  const viewingTimeline = useQuery(
    api.timeline.getById,
    viewingTimelineId ? { id: viewingTimelineId as Id<"timeline"> } : "skip",
  );

  const viewingGroup = useQuery(
    api.timelineGroup.getById,
    viewingGroupId ? { id: viewingGroupId as Id<"timelineGroup"> } : "skip",
  );

  if (isEditingTimeline && editingTimeline) {
    return editingTimeline.name || t("common.untitledTimeline");
  }

  if (isEditingFormation && editingFormation) {
    return editingFormation.name || t("common.untitledFormation");
  }

  if (viewingTimelineId && viewingTimeline) {
    return viewingTimeline.name || t("common.untitledTimeline");
  }

  if (viewingGroupId && viewingGroup) {
    return viewingGroup.name || t("common.untitledTimelineGroup");
  }

  return null;
}

function makeBreadcrumbs(
  tool: BreadcrumbInfo | null,
  itemName?: string | null,
): PageBreadcrumb[] {
  if (!tool) {
    return [{ label: "Home" }];
  }

  return [
    ...(tool.group ? [{ label: tool.group, href: "/" }] : []),
    { label: tool.label, ...(itemName ? { href: tool.href } : {}) },
    ...(itemName ? [{ label: itemName }] : []),
  ];
}

export function useDefaultBreadcrumbs(): PageBreadcrumb[] {
  return makeBreadcrumbs(useToolBreadcrumb());
}

export function useEditingBreadcrumbs(): PageBreadcrumb[] | null {
  const tool = useToolBreadcrumb();
  const itemName = useEditingItemName();
  return itemName ? makeBreadcrumbs(tool, itemName) : null;
}
