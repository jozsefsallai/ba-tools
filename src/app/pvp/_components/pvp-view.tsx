"use client";

import { PVPSeasonsView } from "@/app/pvp/_components/pvp-seasons-view";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { SignInButton, useUser } from "@clerk/nextjs";

export function PVPView() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <MessageBox>Loading...</MessageBox>;
  }

  if (!isSignedIn) {
    return (
      <MessageBox className="flex flex-col gap-6">
        <div>You need an account to use the PVP Tracker tool.</div>

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
