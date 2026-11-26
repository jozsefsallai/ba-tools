"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAnalyticsConsent } from "@/hooks/use-analytics-consent";
import { cn } from "@/lib/utils";

const PRIVACY_POLICY_URL = "https://nimblebun.works/en/privacy";

function PrivacyPolicyLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={PRIVACY_POLICY_URL}
      target="_blank"
      rel="noreferrer noopener"
      className="underline"
    >
      {children}
    </a>
  );
}

function Airi({ className }: { className: string }) {
  return (
    <Image
      src="/assets/ui/analytics/airi-band.webp"
      alt=""
      width={94}
      height={240}
      unoptimized
      className={cn("pointer-events-none w-auto", className)}
    />
  );
}

export function AnalyticsConsentBanner() {
  const t = useTranslations();
  const { available, consent, setConsent } = useAnalyticsConsent();

  if (!available || consent !== "pending") {
    return null;
  }

  return (
    <section
      aria-label={t("common.analytics.title")}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-lg border border-foreground/15 bg-secondary p-4 pl-20 text-sm shadow-2xl"
    >
      <Airi className="absolute bottom-2 left-3 h-36" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-muted-foreground">
          {t.rich("common.analytics.bannerText", {
            a: (children) => <PrivacyPolicyLink>{children}</PrivacyPolicyLink>,
          })}
        </p>

        <div className="flex shrink-0 gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => setConsent(false)}>
            {t("common.analytics.decline")}
          </Button>

          <Button size="sm" onClick={() => setConsent(true)}>
            {t("common.analytics.accept")}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function AnalyticsSettings() {
  const t = useTranslations();
  const { available, consent, setConsent } = useAnalyticsConsent();

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="analytics-enabled">
          {t("common.analytics.enable")}
        </Label>

        <Switch
          id="analytics-enabled"
          disabled={!available}
          checked={consent === "granted"}
          onCheckedChange={setConsent}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        {t.rich("common.analytics.enableHint", {
          a: (children) => <PrivacyPolicyLink>{children}</PrivacyPolicyLink>,
        })}
      </div>
    </div>
  );
}

export function AnalyticsSettingsDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.analytics.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex items-end gap-4">
          <Airi className="h-36 shrink-0" />

          <div className="flex flex-1 flex-col gap-4">
            <DialogDescription>
              {t("common.analytics.description")}
            </DialogDescription>

            <AnalyticsSettings />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
