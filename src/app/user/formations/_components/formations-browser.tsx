"use client";

import { FormationEntry } from "@/app/user/formations/_components/formation-entry";
import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { api } from "~convex/api";

export function FormationsBrowser() {
  const t = useTranslations();
  const query = useQueryWithStatus(api.formation.getOwn);

  if (query.status === "pending") {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("common.failedToLoad", { item: t("tools.formationDisplay.myFormations.title").toLowerCase() })}
      </MessageBox>
    );
  }

  if (query.status === "success" && query.data.length === 0) {
    return (
      <MessageBox>
        <p>{t("tools.formationDisplay.myFormations.noFormations")}</p>
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {query.data.map((formation) => (
        <FormationEntry key={formation._id} entry={formation} />
      ))}
    </div>
  );
}
