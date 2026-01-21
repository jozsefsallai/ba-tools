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
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import {
  ChartNoAxesGanttIcon,
  CogIcon,
  MenuIcon,
  UsersIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UserPreferences } from "@/components/common/user-preferences";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type NavLink = {
  href: string;
  text: string;
};

type NavigationGroup = {
  id: string;
  name: string;
  links: NavLink[];
};

const GAMEPLAY_TOOLS: NavLink[] = [
  {
    href: "/bond",
    text: "Relationship Rank Calculator",
  },
  {
    href: "/timeline-visualizer",
    text: "Timeline Visualizer",
  },
  {
    href: "/inventory-management",
    text: "Inventory Management",
  },
  {
    href: "/railroad-puzzle-solver",
    text: "Railroad Puzzle Solver",
  },
  {
    href: "/raid-score-calculator",
    text: "Raid Score Calculator",
  },
];

const MISC_TOOLS: NavLink[] = [
  {
    href: "/formation-display",
    text: "Formation Display",
  },
  {
    href: "/title-generator",
    text: "Title Generator",
  },
  {
    href: "/gacha-rate-stats",
    text: "Gacha Rate Stats",
  },
  {
    href: "/scenario-image-generator",
    text: "Scenario Image Generator",
  },
];

const RESOURCES: NavLink[] = [
  {
    href: "/global/banners",
    text: "Upcoming Global Banners",
  },
];

const GAMES: NavLink[] = [
  {
    href: "/games/flappy-peroro",
    text: "Flappy Peroro",
  },
];

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: "gameplay-tools",
    name: "Gameplay Tools",
    links: GAMEPLAY_TOOLS,
  },
  {
    id: "misc-tools",
    name: "Misc Tools",
    links: MISC_TOOLS,
  },
  {
    id: "resources",
    name: "Resources",
    links: RESOURCES,
  },
  {
    id: "games",
    name: "Games",
    links: GAMES,
  },
];

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
            <div className="relative">
              <Image src={plana} alt="Plana" width={48} height={48} />
            </div>

            <h1 className="hidden lg:block text-2xl font-bold">
              Joe's Blue Archive Tools
            </h1>
          </div>
        </Link>

        <div className="flex gap-6 items-center">
          <NavigationMenu
            viewport={false}
            delayDuration={0}
            skipDelayDuration={0}
            className="hidden md:block z-10"
          >
            <NavigationMenuList>
              {NAVIGATION_GROUPS.map((group) => (
                <NavigationMenuItem key={group.id}>
                  <NavigationMenuTrigger className="cursor-pointer">
                    {group.name}
                  </NavigationMenuTrigger>

                  <NavigationMenuContent>
                    <ul className="w-[300px] flex flex-col gap-2">
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <NavigationMenuLink
                            asChild
                            className={cn(
                              navigationMenuTriggerStyle(),
                              "block w-full",
                            )}
                          >
                            <Link href={link.href}>{link.text}</Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <ThemeToggle />

          <Unauthenticated>
            <Button asChild>
              <SignInButton mode="modal" oauthFlow="popup" />
            </Button>
          </Unauthenticated>

          <Authenticated>
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  href="/user/formations"
                  label="My formations"
                  labelIcon={<UsersIcon className="size-4" />}
                />

                <UserButton.Link
                  href="/user/timelines"
                  label="My timelines"
                  labelIcon={<ChartNoAxesGanttIcon className="size-4" />}
                />
              </UserButton.MenuItems>

              <UserButton.UserProfilePage
                label="Preferences"
                url="preferences"
                labelIcon={<CogIcon className="size-4" />}
              >
                <UserPreferences />
              </UserButton.UserProfilePage>
            </UserButton>
          </Authenticated>

          <Button
            variant="outline"
            onClick={() => setOpen((prev) => !prev)}
            className="md:hidden"
          >
            <MenuIcon />
          </Button>

          <nav
            className={cn(
              "absolute border shadow-lg top-18 left-0 w-full bg-secondary z-50",
              {
                hidden: !open,
              },
            )}
          >
            <Accordion type="multiple">
              {NAVIGATION_GROUPS.map((group) => (
                <AccordionItem key={group.id} value={group.id}>
                  <AccordionTrigger className="px-4">
                    {group.name}
                  </AccordionTrigger>

                  <AccordionContent className="flex flex-col gap-2 px-4">
                    {group.links.map((link) => (
                      <Button
                        key={link.href}
                        variant="outline"
                        className="justify-start bg-background/30 border-border"
                        asChild
                      >
                        <Link key={link.href} href={link.href}>
                          {link.text}
                        </Link>
                      </Button>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </nav>
        </div>
      </div>
    </header>
  );
}
