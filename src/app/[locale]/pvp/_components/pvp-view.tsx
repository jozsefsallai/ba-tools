"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { PVPSeasonsView } from "@/app/[locale]/pvp/_components/pvp-seasons-view";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";

export function PVPView({
  showArchived,
  onShowArchivedChange,
}: {
  showArchived: boolean;
  onShowArchivedChange: (showArchived: boolean) => void;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const t = useTranslations();

  if (!isLoaded) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (!isSignedIn) {
    return (
      <MessageBox className="flex flex-col gap-6">
        <div>{t("tools.pvp.needAccount")}</div>

        <div>
          <Button asChild>
            <SignInButton mode="modal" oauthFlow="popup" />
          </Button>
        </div>
      </MessageBox>
    );
  }

  return (
    <PVPSeasonsView
      onShowArchivedChange={onShowArchivedChange}
      showArchived={showArchived}
    />
  );
}
