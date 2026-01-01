"use client";

import { setLocale } from "@/actions/set-locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupportedLocale } from "@/i18n/constants";
import { GlobeIcon } from "lucide-react";
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
        <DropdownMenuItem onClick={() => toggleLocale("jp")}>
          日本語
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
