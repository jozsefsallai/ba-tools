"use client";

import { useTranslations } from "next-intl";
import { OwnRostersBrowserItem } from "@/app/[locale]/rosters/(own)/_components/own-rosters-browser-item";
import { MessageBox } from "@/components/common/message-box";
import { Link } from "@/i18n/navigation";
import { useQueryWithStatus } from "@/lib/convex";
import { api } from "~convex/api";

export function OwnRostersBrowser() {
  const t = useTranslations();
  const query = useQueryWithStatus(api.roster.getOwn, {});

  if (query.status === "pending") {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("tools.roster.myRosters.failedToLoad")}
      </MessageBox>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {query.data.map((roster) => (
        <Link href={`/rosters/edit/${roster._id}`} key={roster._id}>
          <OwnRostersBrowserItem roster={roster} />
        </Link>
      ))}
    </div>
  );
}
