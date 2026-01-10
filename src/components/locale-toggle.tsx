"use client";

import { setLocale } from "@/actions/set-locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SupportedLocale } from "@/i18n/constants";
import { GlobeIcon, InfoIcon } from "lucide-react";
import { useLocale } from "next-intl";

export function LocaleToggle() {
  const locale = useLocale();

  async function toggleLocale(newLocale: SupportedLocale) {
    if (locale === newLocale) {
      return;
    }

    await setLocale(newLocale);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <GlobeIcon className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle locale</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => toggleLocale("en")}>
          English
        </DropdownMenuItem>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onClick={() => toggleLocale("jp")}
                className="flex items-center justify-between gap-2"
              >
                <div>日本語</div>

                <InfoIcon />
              </DropdownMenuItem>
            </TooltipTrigger>

            <TooltipContent side="left">
              <p>
                日本語版は現在作成中のため、
                <br />
                誤植や不自然な表現が
                <br />
                含まれている可能性があります。
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
