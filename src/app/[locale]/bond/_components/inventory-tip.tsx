"use client";

import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";
import { Unauthenticated } from "convex/react";
import { LightbulbIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function InventoryTip() {
  const t = useTranslations();

  return (
    <Unauthenticated>
      <div className="text-sm text-muted-foreground border rounded-md px-4 py-2">
        <LightbulbIcon className="inline-block size-4 mr-1 -mt-1" />
        {t.rich("tools.bond.inventoryTip", {
          strong: (children) => <strong>{children}</strong>,
          signIn: () => (
            <Button variant="outline" size="sm" asChild className="mx-1">
              <SignInButton mode="modal" oauthFlow="popup" />
            </Button>
          ),
        })}
      </div>
    </Unauthenticated>
  );
}
