"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { LogInIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PropsWithChildren, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type SignedInOnlyProps = PropsWithChildren<{
  /** Shown in place of the page to visitors who aren't signed in. */
  signedOut: ReactNode;
}>;

export function SignedInOnly({ children, signedOut }: SignedInOnlyProps) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">{signedOut}</Show>
    </>
  );
}

type SignedOutToolViewProps = {
  title: ReactNode;
  description: ReactNode;
  features: ReactNode[];
  /** A sample of what the tool looks like with data in it. */
  example: ReactNode;
};

export function SignedOutToolView({
  title,
  description,
  features,
  example,
}: SignedOutToolViewProps) {
  const t = useTranslations();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-x-16 gap-y-10 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center lg:py-12">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-balance">{title}</h1>

          <p className="max-w-prose text-lg text-muted-foreground text-pretty">
            {description}
          </p>
        </div>

        <ul className="max-w-prose border-t">
          {features.map((feature, index) => (
            <li key={index} className="border-b py-2.5">
              {feature}
            </li>
          ))}
        </ul>

        <div className="flex max-w-prose flex-col gap-3">
          <SignInButton mode="modal" oauthFlow="popup">
            <Button size="lg" className="h-11 w-full text-base">
              <LogInIcon />
              {t("common.signIn")}
            </Button>
          </SignInButton>

          <p className="text-center text-sm text-muted-foreground">
            {t("common.signedOut.prompt")}
          </p>
        </div>
      </div>

      <figure className="flex flex-col gap-2">
        <figcaption className="text-sm text-muted-foreground">
          {t("common.signedOut.example")}
        </figcaption>

        <div
          aria-hidden
          className="pointer-events-none rounded-md border p-5 select-none"
        >
          {example}
        </div>
      </figure>
    </div>
  );
}
