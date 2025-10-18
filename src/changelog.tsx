import Link from "next/link";
import type { ReactNode } from "react";

export const CHANGELOG_SCOPES = {
  website: "Website",
  homePage: "Home Page",
  userCorner: "User Corner",
  authentication: "Authentication",
  bondCalculator: "Bond Calculator",
  timelineVisualizer: "Timeline Visualizer",
  formationDisplay: "Formation Display",
  inventoryManagement: "Inventory Management",
  railroadPuzzleSolver: "Railroad Puzzle Solver",
  gachaRateStats: "Gacha Rate Stats",
  scenarioImageGenerator: "Scenario Image Generator",
  globalBanners: "Global Banners",
  games: "Games",
} as const;

type ChangelogScope = (typeof CHANGELOG_SCOPES)[keyof typeof CHANGELOG_SCOPES];

export type Change = {
  scope?: ChangelogScope;
  description: ReactNode;
};

export type ChangelogItemData = {
  date: string;
  features: Change[];
  fixes: Change[];
  changes: Change[];
};

export const CHANGELOG: ChangelogItemData[] = [
  {
    date: "October 17, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Added target bond rank and remaining EXP calculator + breakdown.",
      },
    ],
    fixes: [],
    changes: [],
  },
  {
    date: "October 17, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.website,
        description:
          "YouTube and BiliBili links will now autoembed videos on places where Markdown formatting is supported.",
      },
      {
        scope: CHANGELOG_SCOPES.website,
        description:
          "Added tips and a link to a Markdown cheat sheet on places where Markdown formatting is supported.",
      },
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description:
          "Added an edit button to own timelines and timeline groups in the publicly shareable page view.",
      },
    ],
    fixes: [],
    changes: [
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description: "Moved location of the cloud save button.",
      },
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description:
          'Renamed "Add Below" button to "Add Here" and made it so it shows up in-between items.',
      },
    ],
  },
  {
    date: "October 12, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.games,
        description: (
          <>
            Added{" "}
            <Link
              href="/games/flappy-peroro"
              className="font-semibold underline"
            >
              Flappy Peroro
            </Link>{" "}
            game.
          </>
        ),
      },
    ],
    fixes: [],
    changes: [
      {
        scope: CHANGELOG_SCOPES.website,
        description: "Better navigation menu categories.",
      },
      {
        scope: CHANGELOG_SCOPES.website,
        description: "Updated navigation menu UX for mobile devices.",
      },
    ],
  },
  {
    date: "October 9, 2025",
    features: [],
    fixes: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Fixed a bug where gift choice boxes would always give 60 exp even if a craftable gift with 80 exp exists, or if the student doensn't have any loved gifts.",
      },
    ],
    changes: [],
  },
  {
    date: "October 5, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description:
          "Added ability to set notes for a student item in a timeline.",
      },
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description: "Added ability to set a description to a timeline.",
      },
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description:
          "Added a toggle for displaying the creator of the timeline in the shareable view.",
      },
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description:
          "Added timeline visualizer groups, which can include multiple timelines.",
      },
      {
        scope: CHANGELOG_SCOPES.website,
        description:
          "Added changelog page and the latest changelog entry on the homepage.",
      },
    ],
    fixes: [
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description:
          "Fixed a bug where saved preferences would override a saved timeline's settings on load.",
      },
      {
        scope: CHANGELOG_SCOPES.formationDisplay,
        description:
          "Fixed a bug where saved preferences would override a saved formation's settings on load.",
      },
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description:
          "Fixed a bug where the trigger autofocus feature would focus when changing certain parameters in a timeline item.",
      },
    ],
    changes: [
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description: "The text item now supports multi-line text.",
      },
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description:
          "Shareable timeline links now use the /timelines/ path instead of /timeline-visualizer/.",
      },
      {
        scope: CHANGELOG_SCOPES.userCorner,
        description: (
          <div>
            The timelines page will now display a list of timeline groups
            instead of individual timelines. To see all timelines, you can click
            on the <strong>All Timelines</strong> option.
          </div>
        ),
      },
    ],
  },
  {
    date: "October 4, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.homePage,
        description:
          "Added quick links to various tools and resources on the home page.",
      },
      {
        scope: CHANGELOG_SCOPES.homePage,
        description: "Added donation box.",
      },
    ],
    fixes: [],
    changes: [],
  },
];
