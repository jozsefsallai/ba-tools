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
import { useTranslations } from "next-intl";
import { LocaleToggle } from "@/components/locale-toggle";

type NavLink = {
  href: string;
  text: string;
};

type NavigationGroup = {
  id: string;
  name: string;
  links: NavLink[];
};

export function TheHeader() {
  const t = useTranslations();

  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const GAMEPLAY_TOOLS: NavLink[] = [
    {
      href: "/bond",
      text: t("common.header.nav.gameplay.bond"),
    },
    {
      href: "/timeline-visualizer",
      text: t("common.header.nav.gameplay.timelineVisualizer"),
    },
    {
      href: "/inventory-management",
      text: t("common.header.nav.gameplay.inventoryManagement"),
    },
    {
      href: "/railroad-puzzle-solver",
      text: t("common.header.nav.gameplay.railroadPuzzleSolver"),
    },
    {
      href: "/raid-score-calculator",
      text: t("common.header.nav.gameplay.raidScore"),
    },
  ];

  const MISC_TOOLS: NavLink[] = [
    {
      href: "/formation-display",
      text: t("common.header.nav.misc.formationDisplay"),
    },
    {
      href: "/title-generator",
      text: t("common.header.nav.misc.titleGenerator"),
    },
    {
      href: "/gacha-rate-stats",
      text: t("common.header.nav.misc.gachaRateStats"),
    },
    {
      href: "/scenario-image-generator",
      text: t("common.header.nav.misc.scenarioImageGenerator"),
    },
  ];

  const RESOURCES: NavLink[] = [
    {
      href: "/global/banners",
      text: t("common.header.nav.resouces.glBanners"),
    },
  ];

  const GAMES: NavLink[] = [
    {
      href: "/games/flappy-peroro",
      text: t("common.header.nav.games.flappyPeroro"),
    },
  ];

  const NAVIGATION_GROUPS: NavigationGroup[] = [
    {
      id: "gameplay-tools",
      name: t("common.header.nav.gameplay.title"),
      links: GAMEPLAY_TOOLS,
    },
    {
      id: "misc-tools",
      name: t("common.header.nav.misc.title"),
      links: MISC_TOOLS,
    },
    {
      id: "resources",
      name: t("common.header.nav.resouces.title"),
      links: RESOURCES,
    },
    {
      id: "games",
      name: t("common.header.nav.games.title"),
      links: GAMES,
    },
  ];

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
              <img
                src="/assets/xmas-hat.png"
                alt=""
                className="absolute top-[-4px] left-[-8px] size-12"
              />
            </div>

            <h1 className="hidden lg:block text-2xl font-bold">
              {t("common.appName")}
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

          <LocaleToggle />
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
