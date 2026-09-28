"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "~convex/api";

function formatRemaining(milliseconds: number) {
  if (milliseconds <= 0) {
    return "0m";
  }

  const totalMinutes = Math.ceil(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function PVPStatsStatus() {
  const t = useTranslations();
  const status = useQuery(api.pvpStats.getStatus);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!status) {
    return null;
  }

  const lastUpdated = status.lastCompletedAt
    ? new Date(status.lastCompletedAt).toLocaleString()
    : t("tools.pvp.stats.status.never");

  const nextUpdate = status.isUpdating
    ? t("tools.pvp.stats.status.updating")
    : status.nextExpectedAt
      ? status.nextExpectedAt <= now
        ? t("tools.pvp.stats.status.due")
        : t("tools.pvp.stats.status.in", {
            duration: formatRemaining(status.nextExpectedAt - now),
          })
      : t("tools.pvp.stats.status.unknown");

  return (
    <p className="text-sm text-muted-foreground">
      {t("tools.pvp.stats.status.label", { lastUpdated, nextUpdate })}
    </p>
  );
}
