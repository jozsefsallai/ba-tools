"use client";

import plana from "@/app/opengraph-image.png";

import { UserPreferences } from "@/components/common/user-preferences";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import {
  ChartNoAxesGanttIcon,
  CogIcon,
  MenuIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

  const NAV_TRIGGER_COLORS = [
    "text-[#ff00ff] data-[state=open]:text-[#ff00ff]",
    "text-[#00cc00] data-[state=open]:text-[#00cc00]",
    "text-[#0099ff] data-[state=open]:text-[#0099ff]",
    "text-[#ff6600] data-[state=open]:text-[#ff6600]",
  ] as const;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="border-b-4 border-[#ff00ff] bg-[#ffffcc] dark:bg-[#1a0033] p-0">
      <div className="marquee-container bg-[#000080] text-[#ffff00] py-1.5 text-xs md:text-sm overflow-hidden border-b-2 border-[#00ff00]">
        <div className="overflow-hidden whitespace-nowrap">
          <span className="inline-block marquee-scroll comic-sans font-bold px-2">
            ★ WELCOME 2 {t("common.appName").toUpperCase()} ★ HOT LINKS BELOW ★{" "}
            <span className="blink">NEW CONTENT EVERY DAY (NOT)</span>
          </span>
        </div>
      </div>

      <div className="container flex justify-between items-center gap-2 p-2 py-3">
        <Link href="/">
          <div className="flex items-center gap-4">
            <div className="relative sparkle-pulse">
              <Image src={plana} alt="Plana" width={48} height={48} />
            </div>

            <h1 className="hidden lg:block text-2xl font-bold font-heading neon-glow text-[#ff00ff] dark:text-[#00ff00]">
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
              {NAVIGATION_GROUPS.map((group, index) => (
                <NavigationMenuItem key={group.id}>
                  <NavigationMenuTrigger
                    className={cn(
                      "cursor-pointer comic-sans font-bold",
                      NAV_TRIGGER_COLORS[index % NAV_TRIGGER_COLORS.length],
                    )}
                  >
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
