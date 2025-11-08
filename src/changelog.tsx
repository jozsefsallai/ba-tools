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
  titleGenerator: "Title Generator",
  pvp: "PVP Tracker",
  games: "Games",
  content: "Content",
  docs: "Documentation",
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
    date: "November 8, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.titleGenerator,
        description: "Added ability to change the width of generated titles.",
      },
    ],
    fixes: [],
    changes: [],
  },
  {
    date: "November 7, 2025",
    features: [],
    fixes: [
      {
        scope: CHANGELOG_SCOPES.globalBanners,
        description: "Fixed appearance of banners with multiple rate-ups.",
      },
    ],
    changes: [
      {
        scope: CHANGELOG_SCOPES.globalBanners,
        description: "Updated styles of banner items.",
      },
      {
        scope: CHANGELOG_SCOPES.globalBanners,
        description: "Current banners are now highlighted.",
      },
    ],
  },
  {
    date: "November 3, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.titleGenerator,
        description: (
          <>
            <strong>New Tool:</strong> Title Generator. You can use this tool to
            generate rendered relationship rank, talent level, boss, group, and
            basic titles.{" "}
            <Link href="/title-generator" className="font-semibold underline">
              Check it out!
            </Link>
          </>
        ),
      },
    ],
    fixes: [],
    changes: [
      {
        scope: CHANGELOG_SCOPES.pvp,
        description: "Added ability to move formation items up and down.",
      },
    ],
  },
  {
    date: "October 26, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "If you're logged in, the site will prompt you to save your changes if you try to leave the page with unsaved changes.",
      },
      {
        scope: CHANGELOG_SCOPES.formationDisplay,
        description:
          "If you're logged in, the site will prompt you to save your changes if you try to leave the page with unsaved changes.",
      },
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description:
          "The site will now prompt you to save your changes if you try to leave the page with unsaved changes.",
      },
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Gift choice boxes will now be saved in your gift inventory.",
      },
    ],
    fixes: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Fixed a bug where the gift breakdown would also count gifts that weren't enabled for a specific student.",
      },
      {
        scope: CHANGELOG_SCOPES.timelineVisualizer,
        description: "Fixed trigger autofocus not working correctly.",
      },
    ],
    changes: [
      {
        scope: CHANGELOG_SCOPES.docs,
        description:
          "Updated documentation for the following tools: Relationship Rank Calculator, Formation Display, Timeline Visualizer, Scenario Image Generator.",
      },
    ],
  },
  {
    date: "October 25, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.website,
        description:
          "Added link to Terms of Service and Privacy Policy in footer.",
      },
    ],
    fixes: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Fixed a bug where gift counts won't update after selecting an inventory when opening the bond calculator from a different page.",
      },
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description: "Fixed gift breakdown also counting disabled gifts.",
      },
    ],
    changes: [
      {
        scope: CHANGELOG_SCOPES.authentication,
        description:
          "Authentication will now seamlessly happen on the page via modals. This prevents data loss when logging in after you've made changes in a tool, as it no longer requires a redirect.",
      },
    ],
  },
  {
    date: "October 24, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description: (
          <div className="flex flex-col gap-1">
            <div>
              Added gift inventory (BETA). You can now save your gift inventory
              in the cloud and use it to create bond targets, eliminating the
              need to always set up your gifts and bond progress from scratch.
            </div>

            <div className="text-xs text-muted-foreground">
              <strong>Note:</strong> This feature is only available for users
              with an account.
            </div>
          </div>
        ),
      },
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Added ability to sort gifts based on the selected student's preferences.",
      },
    ],
    fixes: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description: "Fixed layout issues on small screens.",
      },
      {
        scope: CHANGELOG_SCOPES.website,
        description:
          "Fixed the site name breaking the header layout on small screens.",
      },
    ],
    changes: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Enabled gifts now have a green border and a faint green background, making it easier to identify them.",
      },
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Gift description popups will now have a faint yellow or purple background depending on the gift's rarity.",
      },
    ],
  },
  {
    date: "October 23, 2025",
    features: [],
    fixes: [],
    changes: [
      {
        scope: CHANGELOG_SCOPES.content,
        description: (
          <>
            <p>Added students:</p>

            <ul className="list-disc list-inside text-sm">
              <li>Rabu</li>
              <li>Reisa (Magical)</li>
              <li>Suzumi (Magical)</li>
            </ul>
          </>
        ),
      },
      {
        scope: CHANGELOG_SCOPES.content,
        description: (
          <>
            <p>Added upcoming banners:</p>

            <ul className="list-disc list-inside text-sm">
              <li>Hina (Swimsuit), Iori (Swimsuit), Mimori (Swimsuit)</li>
              <li>Reisa (Magical), Suzumi (Magical)</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    date: "October 18, 2025",
    features: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Added target bond rank and remaining EXP calculator + breakdown.",
      },
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description:
          "Added ability to specify current and target bond EXP values.",
      },
    ],
    fixes: [],
    changes: [
      {
        scope: CHANGELOG_SCOPES.bondCalculator,
        description: "Updated Relationship Rank Calculator UI layout.",
      },
      {
        scope: CHANGELOG_SCOPES.website,
        description: "Improved changelog UI on mobile devices.",
      },
      {
        scope: CHANGELOG_SCOPES.website,
        description: "Added Spine Runtime License Agreement to Credits page.",
      },
    ],
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
