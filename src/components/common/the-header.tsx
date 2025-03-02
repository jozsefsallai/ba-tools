"use client";

import plana from "@/app/opengraph-image.png";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import Image from "next/image";
import Link from "next/link";

export function TheHeader() {
  return (
    <header className="border-b p-2 py-3">
      <div className="container flex justify-between items-center gap-2">
        <Link href="/">
          <div className="flex items-center gap-4">
            <Image src={plana} alt="Plana" width={48} height={48} />

            <h1 className="hidden md:block text-2xl font-bold">
              Joe's Blue Archive Tools
            </h1>
          </div>
        </Link>

        <div className="flex gap-2 items-center">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/formation-display" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Formation Display
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
