import type { Messages } from "@/i18n/types";

type MessagePath<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends object
      ? `${K}.${MessagePath<T[K]>}`
      : never;
}[keyof T & string];

export type OgVariant =
  | "home"
  | "formation"
  | "timeline"
  | "bond"
  | "probability"
  | "progress"
  | "railway"
  | "chat"
  | "birthday"
  | "banner"
  | "game"
  | "scene"
  | "inventory"
  | "not-found";

export type OgIconName =
  | "heart"
  | "list-ordered"
  | "grid-2x2"
  | "train-track"
  | "calculator"
  | "clipboard-minus"
  | "swords"
  | "users"
  | "id-card"
  | "square-text"
  | "rectangle-ellipsis"
  | "dices"
  | "book-open-text"
  | "message-circle-heart"
  | "gem"
  | "cake"
  | "gamepad"
  | "shield";

type OgText = { message: MessagePath<Messages> };

export type OgCardDefinition = {
  title: OgText;
  description: OgText;
  variant: OgVariant;
  icon?: OgIconName;
};

export const OG_DESIGN_VERSION = "7";

const HOME_CARD = {
  title: {
    message: "common.sharing.cards.home.title",
  },
  description: {
    message: "common.sharing.cards.home.description",
  },
  variant: "home",
} as const satisfies OgCardDefinition;

export const OG_CARDS = {
  "137": HOME_CARD,

  home: HOME_CARD,

  rest: {
    title: {
      message: "common.notFound.title",
    },
    description: {
      message: "common.notFound.description",
    },
    variant: "not-found",
  },

  "admin-banners": {
    title: {
      message: "tools.admin.banners.title",
    },
    description: {
      message: "tools.admin.banners.description",
    },
    variant: "banner",
    icon: "shield",
  },

  "admin-roadmap": {
    title: {
      message: "tools.admin.roadmap.title",
    },
    description: {
      message: "tools.admin.roadmap.description",
    },
    variant: "banner",
    icon: "shield",
  },

  birthdays: {
    title: {
      message: "tools.birthdays.title",
    },
    description: {
      message: "tools.birthdays.description",
    },
    variant: "birthday",
  },

  students: {
    title: {
      message: "tools.students.title",
    },
    description: {
      message: "tools.students.description",
    },
    variant: "home",
    icon: "users",
  },

  bond: {
    title: {
      message: "common.sharing.cards.bond.title",
    },
    description: {
      message: "common.sharing.cards.bond.description",
    },
    variant: "bond",
  },

  changelog: {
    title: {
      message: "common.sharing.cards.changelog.title",
    },
    description: {
      message: "common.sharing.cards.changelog.description",
    },
    variant: "home",
  },

  credits: {
    title: {
      message: "static.credits.title",
    },
    description: {
      message: "common.sharing.cards.credits.description",
    },
    variant: "home",
  },

  "formation-display": {
    title: {
      message: "tools.formationDisplay.title",
    },
    description: {
      message: "tools.formationDisplay.description",
    },
    variant: "formation",
  },

  "gacha-rate-stats": {
    title: {
      message: "common.sharing.cards.gacha-rate-stats.title",
    },
    description: {
      message: "common.sharing.cards.gacha-rate-stats.description",
    },
    variant: "probability",
  },

  "games-flappy-peroro": {
    title: {
      message: "static.flappyPeroro.title",
    },
    description: {
      message: "static.flappyPeroro.description",
    },
    variant: "game",
  },

  "global-banners": {
    title: {
      message: "static.banners.title",
    },
    description: {
      message: "common.sharing.cards.global-banners.description",
    },
    variant: "banner",
  },

  "global-roadmap": {
    title: {
      message: "static.roadmap.title",
    },
    description: {
      message: "common.sharing.cards.global-roadmap.description",
    },
    variant: "banner",
  },

  "inventory-management": {
    title: {
      message: "tools.inventoryManagement.title",
    },
    description: {
      message: "tools.inventoryManagement.description",
    },
    variant: "inventory",
  },

  "not-found": {
    title: {
      message: "common.notFound.title",
    },
    description: {
      message: "common.notFound.description",
    },
    variant: "not-found",
  },

  plana: {
    title: {
      message: "common.sharing.cards.plana.title",
    },
    description: {
      message: "common.sharing.cards.plana.description",
    },
    variant: "home",
  },

  "plana-ai-chatId": {
    title: {
      message: "common.sharing.cards.plana-ai-chatId.title",
    },
    description: {
      message: "common.sharing.cards.plana-ai-chatId.description",
    },
    variant: "chat",
  },

  "pvp-seasonId-match-matchId": {
    title: {
      message: "tools.pvp.match.editMatch",
    },
    description: {
      message: "tools.pvp.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-match-import": {
    title: {
      message: "tools.pvp.screenshotImport.title",
    },
    description: {
      message: "tools.pvp.screenshotImport.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-match-new": {
    title: {
      message: "tools.pvp.match.recordNewMatch",
    },
    description: {
      message: "tools.pvp.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId": {
    title: {
      message: "tools.pvp.title",
    },
    description: {
      message: "tools.pvp.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-presets-formations-presetId": {
    title: {
      message: "tools.pvp.presets.editFormation",
    },
    description: {
      message: "tools.pvp.presets.formationDescription",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-presets-formations-new": {
    title: {
      message: "tools.pvp.presets.createFormation",
    },
    description: {
      message: "tools.pvp.presets.formationDescription",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-presets-formations": {
    title: {
      message: "tools.pvp.presets.formationTitle",
    },
    description: {
      message: "tools.pvp.presets.formationDescription",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-presets-opponents-presetId-history": {
    title: {
      message: "tools.pvp.presets.battleHistory",
    },
    description: {
      message:
        "common.sharing.cards.pvp-seasonId-presets-opponents-presetId-history.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-presets-opponents-presetId": {
    title: {
      message: "tools.pvp.presets.editEnemy",
    },
    description: {
      message: "tools.pvp.presets.enemyDescription",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-presets-opponents-presetId-teams": {
    title: {
      message: "tools.pvp.presets.teamsTitle",
    },
    description: {
      message: "tools.pvp.presets.enemyDescription",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-presets-opponents-new": {
    title: {
      message: "tools.pvp.presets.createEnemy",
    },
    description: {
      message: "tools.pvp.presets.enemyDescription",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-presets-opponents": {
    title: {
      message: "tools.pvp.presets.enemyTitle",
    },
    description: {
      message: "tools.pvp.presets.enemyDescription",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-seasonId-presets": {
    title: {
      message: "tools.pvp.presets.title",
    },
    description: {
      message: "tools.pvp.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-icon-debug": {
    title: {
      message: "common.sharing.cards.pvp-icon-debug.title",
    },
    description: {
      message: "common.sharing.cards.pvp-icon-debug.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-most-effective-teams": {
    title: {
      message: "tools.pvp.rankings.title",
    },
    description: {
      message: "tools.pvp.rankings.description",
    },
    variant: "formation",
    icon: "swords",
  },

  pvp: {
    title: {
      message: "tools.pvp.title",
    },
    description: {
      message: "tools.pvp.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-screenshot-debug": {
    title: {
      message: "common.sharing.cards.pvp-screenshot-debug.title",
    },
    description: {
      message: "common.sharing.cards.pvp-screenshot-debug.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "pvp-search": {
    title: {
      message: "tools.pvp.stats.title",
    },
    description: {
      message: "tools.pvp.stats.description",
    },
    variant: "formation",
    icon: "swords",
  },

  "raid-score-calculator": {
    title: {
      message: "common.sharing.cards.raid-score-calculator.title",
    },
    description: {
      message: "common.sharing.cards.raid-score-calculator.description",
    },
    variant: "progress",
  },

  "railroad-puzzle-solver": {
    title: {
      message: "tools.railroad.title",
    },
    description: {
      message: "common.sharing.cards.railroad-puzzle-solver.description",
    },
    variant: "railway",
  },

  "scenario-image-generator": {
    title: {
      message: "tools.scenarioImageGenerator.title",
    },
    description: {
      message: "tools.scenarioImageGenerator.description",
    },
    variant: "scene",
  },

  "student-exp-calculator": {
    title: {
      message: "common.sharing.cards.student-exp-calculator.title",
    },
    description: {
      message: "common.sharing.cards.student-exp-calculator.description",
    },
    variant: "progress",
    icon: "clipboard-minus",
  },

  "timeline-visualizer": {
    title: {
      message: "tools.timeline.title",
    },
    description: {
      message: "common.sharing.cards.timeline-visualizer.description",
    },
    variant: "timeline",
  },

  "title-generator": {
    title: {
      message: "common.sharing.cards.title-generator.title",
    },
    description: {
      message: "common.sharing.cards.title-generator.description",
    },
    variant: "scene",
    icon: "rectangle-ellipsis",
  },

  "user-formations": {
    title: {
      message: "tools.formationDisplay.myFormations.title",
    },
    description: {
      message: "tools.formationDisplay.myFormations.description",
    },
    variant: "formation",
  },

  "user-recruitment": {
    title: {
      message: "tools.recruitment.title",
    },
    description: {
      message: "tools.recruitment.description",
    },
    variant: "probability",
    icon: "square-text",
  },

  "user-rosters": {
    title: {
      message: "tools.roster.myRosters.title",
    },
    description: {
      message: "tools.roster.myRosters.pageDescription",
    },
    variant: "formation",
    icon: "id-card",
  },

  "user-timelines": {
    title: {
      message: "common.sharing.cards.user-timelines.title",
    },
    description: {
      message: "common.sharing.cards.user-timelines.description",
    },
    variant: "timeline",
  },

  admin: {
    title: {
      message: "common.sharing.cards.admin.title",
    },
    description: {
      message: "common.sharing.cards.admin.description",
    },
    variant: "home",
    icon: "shield",
  },

  user: {
    title: {
      message: "common.sharing.cards.user.title",
    },
    description: {
      message: "common.sharing.cards.user.description",
    },
    variant: "home",
  },
} as const satisfies Record<string, OgCardDefinition>;

export type OgCardKey = keyof typeof OG_CARDS;

export function isOgCardKey(key: string): key is OgCardKey {
  return Object.hasOwn(OG_CARDS, key);
}
