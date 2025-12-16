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

const RESOURCES: Resource[] = [
  {
    name: "Relationship Rank Calculator",
    path: "/bond",
    icon: <HeartIcon className="size-10 text-red-700 shrink-0" />,
    description:
      "Calculate the relationship rank you can get from gifts you give to students. Find what gifts each student likes the most.",
  },
  {
    name: "Timeline Visualizer",
    path: "/timeline-visualizer",
    icon: <ListOrderedIcon className="size-10 text-yellow-500 shrink-0" />,
    description:
      "Visualize your EX skill rotation timelines in an intuitive graphical format. Create timelines for yourself, to use in videos, or to share with other players.",
  },
  {
    name: "Inventory Management",
    path: "/inventory-management",
    icon: <Grid2X2Icon className="size-10 text-purple-400 shrink-0" />,
    description:
      "Find the most likely placements of items in the Battleship-style minigame. Helps you minimize the number of currency you need to unlock certain items.",
  },
  {
    name: "Railroad Puzzle Solver",
    path: "/railroad-puzzle-solver",
    icon: <TrainTrackIcon className="size-10 text-green-500 shrink-0" />,
    description:
      "Find and visualize the optimal paths in the Highlander event's Railroad Puzzle minigame. Specify a custom configuration or find the most minimal ones.",
  },
  {
    name: "Raid Score Calculator",
    path: "/raid-score-calculator",
    icon: <CalculatorIcon className="size-10 text-blue-500 shrink-0" />,
    description:
      "Convert between clear time and raid score for various bosses and difficulties. Supports multiple teams and remaining time input (for single teams).",
    isNew: true,
  },
  {
    name: "Formation Display",
    path: "/formation-display",
    icon: <UsersIcon className="size-10 text-orange-500 shrink-0" />,
    description:
      "Display a formation of students in a design that's similar to what you'd see in-game. Useful for YouTube thumbnails or spreadsheets.",
  },
  {
    name: "Title Generator",
    path: "/title-generator",
    icon: <RectangleEllipsisIcon className="size-10 text-[#8fc9ff] shrink-0" />,
    description:
      "Generate fully rendered user titles for boss completions, relationship rank, talent levels, school clubs, as well as generic titles with custom text.",
  },
  {
    name: "Gacha Rate Stats",
    path: "/gacha-rate-stats",
    icon: <DicesIcon className="size-10 text-blue-400 shrink-0" />,
    description:
      "Track the 3* rate of a pulling session in real time. You may use it in gacha videos or streams to display your luck (or lack thereof).",
  },
  {
    name: "Scenario Image Generator",
    path: "/scenario-image-generator",
    icon: <BookOpenTextIcon className="size-10 text-violet-500 shrink-0" />,
    description:
      "Create and generate images that resemble the in-game story UI. Use custom backgrounds, texts, characters, and more.",
  },
  {
    name: "Upcoming Global Banners",
    path: "/global/banners",
    icon: <GemIcon className="size-10 text-blue-300 shrink-0" />,
    description:
      "Track the upcoming rate-up banners that are going to be available in the Global version. Data is based on JP banners and may change.",
  },
];

export function ToolsAndResources() {
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
