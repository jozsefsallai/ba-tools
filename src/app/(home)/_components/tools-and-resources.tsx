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
      {RESOURCES.map((item) => (
        <Link key={item.path} href={item.path}>
          <div className="h-full flex items-start space-x-4 border rounded-md p-4 hover:bg-accent relative">
            {item.icon}

            <div>
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>

            {(item.isHot || item.isNew) && (
              <span
                className={cn(
                  "absolute top-5 right-4 font-nexon-football-gothic uppercase text-xs italic px-2 py-1 rounded-full text-white",
                  {
                    "text-yellow-400": item.isHot,
                    "text-red-400": item.isNew,
                  },
                )}
              >
                {item.isHot ? "Hot" : "New"}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
