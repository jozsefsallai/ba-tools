import { cn } from "@/lib/utils";
import {
  BookOpenTextIcon,
  CalculatorIcon,
  DicesIcon,
  GemIcon,
  Grid2X2Icon,
  HeartIcon,
  ListOrderedIcon,
  RectangleEllipsisIcon,
  TrainTrackIcon,
  UsersIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";

type Resource = {
  name: string;
  path: string;
  icon: ReactNode;
  description: string;
  isHot?: boolean;
  isNew?: boolean;
};

const CARD_GEOSITIES = [
  {
    border: "border-[#ff00ff]",
    bg: "bg-[#ffccff]",
    darkBg: "dark:bg-[#330033]",
  },
  {
    border: "border-[#00ff00]",
    bg: "bg-[#ccffcc]",
    darkBg: "dark:bg-[#003300]",
  },
  {
    border: "border-[#00ffff]",
    bg: "bg-[#ccffff]",
    darkBg: "dark:bg-[#003333]",
  },
  {
    border: "border-[#ffff00]",
    bg: "bg-[#ffffcc]",
    darkBg: "dark:bg-[#333300]",
  },
] as const;

export async function ToolsAndResources() {
  const t = await getTranslations();

  const RESOURCES: Resource[] = [
    {
      name: t("static.home.toollist.bond.title"),
      path: "/bond",
      icon: <HeartIcon className="size-10 text-red-700 shrink-0" />,
      description: t("static.home.toollist.bond.description"),
    },
    {
      name: t("static.home.toollist.timelineVisualizer.title"),
      path: "/timeline-visualizer",
      icon: <ListOrderedIcon className="size-10 text-yellow-500 shrink-0" />,
      description: t("static.home.toollist.timelineVisualizer.description"),
    },
    {
      name: t("static.home.toollist.inventoryManagement.title"),
      path: "/inventory-management",
      icon: <Grid2X2Icon className="size-10 text-purple-400 shrink-0" />,
      description: t("static.home.toollist.inventoryManagement.description"),
    },
    {
      name: t("static.home.toollist.railroadPuzzleSolver.title"),
      path: "/railroad-puzzle-solver",
      icon: <TrainTrackIcon className="size-10 text-green-500 shrink-0" />,
      description: t("static.home.toollist.railroadPuzzleSolver.description"),
    },
    {
      name: t("static.home.toollist.raidScore.title"),
      path: "/raid-score-calculator",
      icon: <CalculatorIcon className="size-10 text-blue-500 shrink-0" />,
      description: t("static.home.toollist.raidScore.description"),
      isNew: true,
    },
    {
      name: t("static.home.toollist.formationDisplay.title"),
      path: "/formation-display",
      icon: <UsersIcon className="size-10 text-orange-500 shrink-0" />,
      description: t("static.home.toollist.formationDisplay.description"),
    },
    {
      name: t("static.home.toollist.titleGenerator.title"),
      path: "/title-generator",
      icon: (
        <RectangleEllipsisIcon className="size-10 text-[#8fc9ff] shrink-0" />
      ),
      description: t("static.home.toollist.titleGenerator.description"),
    },
    {
      name: t("static.home.toollist.gachaRateStats.title"),
      path: "/gacha-rate-stats",
      icon: <DicesIcon className="size-10 text-blue-400 shrink-0" />,
      description: t("static.home.toollist.gachaRateStats.description"),
    },
    {
      name: t("static.home.toollist.scenarioImageGenerator.title"),
      path: "/scenario-image-generator",
      icon: <BookOpenTextIcon className="size-10 text-violet-500 shrink-0" />,
      description: t("static.home.toollist.scenarioImageGenerator.description"),
    },
    {
      name: t("static.home.toollist.glBanners.title"),
      path: "/global/banners",
      icon: <GemIcon className="size-10 text-blue-300 shrink-0" />,
      description: t("static.home.toollist.glBanners.description"),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {RESOURCES.map((item, index) => {
        const geo = CARD_GEOSITIES[index % CARD_GEOSITIES.length];
        return (
          <Link key={item.path} href={item.path}>
            <div
              className={cn(
                "h-full flex items-start space-x-4 border-4 rounded-none p-4 shadow-md relative hover:brightness-110 transition",
                geo.border,
                geo.bg,
                geo.darkBg,
              )}
            >
              {item.icon}

              <div>
                <h3 className="text-lg font-bold font-heading text-[#000080] dark:text-[#00ff00]">
                  {item.name}
                </h3>
                <p className="text-sm comic-sans text-white">
                  {item.description}
                </p>
              </div>

              {(item.isHot || item.isNew) && (
                <span
                  className={cn(
                    "absolute top-2 right-2 comic-sans uppercase text-xs font-bold px-2 py-1 border-2 border-black bg-[#ffff00] text-[#ff0000] blink",
                  )}
                >
                  {item.isHot
                    ? `${t("common.hot")}!!!`
                    : `${t("common.new")}!!!`}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
