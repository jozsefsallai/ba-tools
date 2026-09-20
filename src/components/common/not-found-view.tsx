"use client";

import { Plana } from "@/components/plana";
import { Button } from "@/components/ui/button";
import { HomeIcon } from "lucide-react";
import type { ElementType } from "react";

export type NotFoundViewProps = {
  code: string;
  title: string;
  description: string;
  quote: string;
  homeLabel: string;
  homeHref?: string;
  LinkComponent?: ElementType;
};

export function NotFoundView({
  code,
  title,
  description,
  quote,
  homeLabel,
  homeHref = "/",
  LinkComponent = "a",
}: NotFoundViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] py-8">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border bg-gradient-to-b from-card via-card to-muted/40 shadow-md md:flex-row md:items-end">
        <div className="flex flex-col items-center gap-5 px-6 py-8 text-center sm:px-8 md:flex-1 md:items-start md:pb-10 md:pl-10 md:pr-6 md:pt-10 md:text-left">
          <div className="flex flex-col gap-2">
            <p className="font-nexon-football-gothic text-7xl font-bold italic leading-none tracking-tight text-muted-foreground sm:text-8xl">
              {code}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>

          <div className="relative max-w-md rounded-2xl border bg-background/80 px-5 py-4 text-left text-sm shadow-sm backdrop-blur-sm">
            <div
              aria-hidden
              className="absolute -bottom-2 left-8 size-4 rotate-45 border-b border-r bg-background/80 md:left-auto md:-right-2 md:bottom-8 md:border-b-0 md:border-t md:border-r"
            />
            <p className="relative text-card-foreground leading-relaxed">
              {quote}
            </p>
          </div>

          <Button asChild size="lg">
            <LinkComponent href={homeHref}>
              <HomeIcon />
              {homeLabel}
            </LinkComponent>
          </Button>
        </div>

        <div className="relative mx-auto h-72 w-64 shrink-0 overflow-hidden sm:h-80 sm:w-72 md:mx-0">
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <div
              className="origin-bottom"
              style={{
                transform: "translateY(28%) scale(0.72)",
              }}
            >
              <Plana expression="confused" inline />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
