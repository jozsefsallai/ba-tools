import type { ReactNode } from "react";

export type Change = {
  scope?: string;
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
    date: "October 5, 2025",
    features: [
      {
        scope: "Timeline Visualizer",
        description:
          "Added ability to set notes for a student item in a timeline.",
      },
      {
        scope: "Timeline Visualizer",
        description: "Added ability to set a description to a timeline.",
      },
      {
        scope: "Timeline Visualizer",
        description:
          "Added a toggle for displaying the creator of the timeline in the shareable view.",
      },
      {
        scope: "Timeline Visualizer",
        description:
          "Added timeline visualizer groups, which can include multiple timelines.",
      },
      {
        scope: "Website",
        description:
          "Added changelog page and the latest changelog entry on the homepage.",
      },
    ],
    fixes: [
      {
        scope: "Timeline Visualizer",
        description:
          "Fixed a bug where saved preferences would override a saved timeline's settings on load.",
      },
      {
        scope: "Formation Editor",
        description:
          "Fixed a bug where saved preferences would override a saved formation's settings on load.",
      },
      {
        scope: "Timeline Visualizer",
        description:
          "Fixed a bug where the trigger autofocus feature would focus when changing certain parameters in a timeline item.",
      },
    ],
    changes: [
      {
        scope: "Timeline Visualizer",
        description: "The text item now supports multi-line text.",
      },
      {
        scope: "Timeline Visualizer",
        description:
          "Shareable timeline links now use the /timelines/ path instead of /timeline-visualizer/.",
      },
      {
        scope: "User Corner",
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
        scope: "Home Page",
        description:
          "Added quick links to various tools and resources on the home page.",
      },
      {
        scope: "Home Page",
        description: "Added donation box.",
      },
    ],
    fixes: [],
    changes: [],
  },
];
