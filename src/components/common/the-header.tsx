"use client";

import plana from "@/app/opengraph-image.png";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavLink = {
  href: string;
  text: string;
};

const GAMEPLAY_TOOLS: NavLink[] = [
  {
    href: "/inventory-management",
    text: "Inventory Management",
  },
  {
    href: "/bond",
    text: "Relationship Rank Calculator",
  },
];

const MISC_TOOLS: NavLink[] = [
  {
    href: "/formation-display",
    text: "Formation Display",
  },
  {
    href: "/gacha-rate-stats",
    text: "Gacha Rate Stats",
  },
];

const LINKS: NavLink[] = [...GAMEPLAY_TOOLS, ...MISC_TOOLS];

export function TheHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
          <NavigationMenu className="hidden md:block">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="cursor-pointer">
                  Gameplay Tools
                </NavigationMenuTrigger>

                <NavigationMenuContent>
                  <div className="w-[300px] p-1 flex flex-col gap-2">
                    {GAMEPLAY_TOOLS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        passHref
                        legacyBehavior
                      >
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            "block w-full",
                          )}
                        >
                          {link.text}
                        </NavigationMenuLink>
                      </Link>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="cursor-pointer">
                  Misc Tools
                </NavigationMenuTrigger>

                <NavigationMenuContent>
                  <div className="w-[300px] p-1 flex flex-col gap-2">
                    {MISC_TOOLS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        passHref
                        legacyBehavior
                      >
                        <NavigationMenuLink
                          className={cn(
                            navigationMenuTriggerStyle(),
                            "block w-full",
                          )}
                        >
                          {link.text}
                        </NavigationMenuLink>
                      </Link>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <ThemeToggle />

          <Button
            variant="outline"
            onClick={() => setOpen((prev) => !prev)}
            className="md:hidden"
          >
            <MenuIcon />
          </Button>

          <nav
            className={cn(
              "absolute border top-18 left-0 w-full bg-background p-4 flex flex-col gap-4",
              {
                hidden: !open,
              },
            )}
          >
            {LINKS.map((link) => (
              <Button key={link.href} variant="outline" asChild>
                <Link key={link.href} href={link.href}>
                  {link.text}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
