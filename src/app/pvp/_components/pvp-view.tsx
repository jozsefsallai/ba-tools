"use client";

import { PVPSeasonsView } from "@/app/pvp/_components/pvp-seasons-view";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

export function PVPView() {
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

  return <PVPSeasonsView />;
}
