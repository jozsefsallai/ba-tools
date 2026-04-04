"use client";

import plana from "@/app/opengraph-image.png";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import {
  CalculatorIcon,
  CalendarIcon,
  ChartNoAxesGanttIcon,
  CogIcon,
  DicesIcon,
  EllipsisIcon,
  GamepadIcon,
  HeartIcon,
  ImageIcon,
  PackageIcon,
  TrainFrontIcon,
  TypeIcon,
  UsersIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPreferences } from "@/components/common/user-preferences";
import type { LucideIcon } from "lucide-react";
import { api } from "~convex/api";

type NavLink = {
  href: string;
  text: string;
  icon: LucideIcon;
  recentItems?: {
    type: "timeline" | "formation";
    viewAllHref: string;
  };
};

type NavigationGroup = {
  id: string;
  name: string;
  links: NavLink[];
};

function RecentTimelines() {
  const t = useTranslations();
  const timelines = useQuery(api.timeline.getOwn);
  const recent = timelines?.slice(0, 5);

  if (!recent || recent.length === 0) return null;

  return (
    <>
      {recent.map((tl) => (
        <SidebarMenuSubItem key={tl._id}>
          <SidebarMenuSubButton asChild size="sm">
            <Link href={`/timeline-visualizer?id=${tl._id}`}>
              <span className={tl.name ? "truncate" : "truncate italic text-muted-foreground"}>
                {tl.name || t("common.untitledTimeline")}
              </span>
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild size="sm">
          <Link
            href="/user/timelines"
            className="text-muted-foreground"
          >
            <EllipsisIcon className="size-3" />
            <span>{t("common.viewAll")}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    </>
  );
}

function RecentFormations() {
  const t = useTranslations();
  const formations = useQuery(api.formation.getOwn);
  const recent = formations?.slice(0, 5);

  if (!recent || recent.length === 0) return null;

  return (
    <>
      {recent.map((f) => (
        <SidebarMenuSubItem key={f._id}>
          <SidebarMenuSubButton asChild size="sm">
            <Link href={`/formation-display?id=${f._id}`}>
              <span className={f.name ? "truncate" : "truncate italic text-muted-foreground"}>
                {f.name || t("common.untitledFormation")}
              </span>
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild size="sm">
          <Link
            href="/user/formations"
            className="text-muted-foreground"
          >
            <EllipsisIcon className="size-3" />
            <span>{t("common.viewAll")}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    </>
  );
}

const RECENT_ITEMS_COMPONENTS = {
  timeline: RecentTimelines,
  formation: RecentFormations,
} as const;

function NavItem({
  link,
  isActive,
}: {
  link: NavLink;
  isActive: boolean;
}) {
  const RecentItemsComponent =
    isActive && link.recentItems
      ? RECENT_ITEMS_COMPONENTS[link.recentItems.type]
      : null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={link.text}
      >
        <Link href={link.href}>
          <link.icon />
          <span>{link.text}</span>
        </Link>
      </SidebarMenuButton>
      {RecentItemsComponent && (
        <Authenticated>
          <SidebarMenuSub>
            <RecentItemsComponent />
          </SidebarMenuSub>
        </Authenticated>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  const GAMEPLAY_TOOLS: NavLink[] = [
    {
      href: "/bond",
      text: t("common.header.nav.gameplay.bond"),
      icon: HeartIcon,
    },
    {
      href: "/timeline-visualizer",
      text: t("common.header.nav.gameplay.timelineVisualizer"),
      icon: ChartNoAxesGanttIcon,
      recentItems: {
        type: "timeline",
        viewAllHref: "/user/timelines",
      },
    },
    {
      href: "/inventory-management",
      text: t("common.header.nav.gameplay.inventoryManagement"),
      icon: PackageIcon,
    },
    {
      href: "/railroad-puzzle-solver",
      text: t("common.header.nav.gameplay.railroadPuzzleSolver"),
      icon: TrainFrontIcon,
    },
    {
      href: "/raid-score-calculator",
      text: t("common.header.nav.gameplay.raidScore"),
      icon: CalculatorIcon,
    },
  ];

  const MISC_TOOLS: NavLink[] = [
    {
      href: "/formation-display",
      text: t("common.header.nav.misc.formationDisplay"),
      icon: UsersIcon,
      recentItems: {
        type: "formation",
        viewAllHref: "/user/formations",
      },
    },
    {
      href: "/title-generator",
      text: t("common.header.nav.misc.titleGenerator"),
      icon: TypeIcon,
    },
    {
      href: "/gacha-rate-stats",
      text: t("common.header.nav.misc.gachaRateStats"),
      icon: DicesIcon,
    },
    {
      href: "/scenario-image-generator",
      text: t("common.header.nav.misc.scenarioImageGenerator"),
      icon: ImageIcon,
    },
  ];

  const RESOURCES: NavLink[] = [
    {
      href: "/global/banners",
      text: t("common.header.nav.resouces.glBanners"),
      icon: CalendarIcon,
    },
  ];

  const GAMES: NavLink[] = [
    {
      href: "/games/flappy-peroro",
      text: t("common.header.nav.games.flappyPeroro"),
      icon: GamepadIcon,
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image src={plana} alt="Plana" width={32} height={32} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">
                    {t("common.appName")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAVIGATION_GROUPS.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.name}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.links.map((link) => (
                  <NavItem
                    key={link.href}
                    link={link}
                    isActive={pathname.startsWith(link.href)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-center gap-2 group-data-[collapsible=icon]:flex-col">
          <LocaleToggle />
          <ThemeToggle />

          <Unauthenticated>
            <Button asChild size="icon" variant="outline">
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
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
