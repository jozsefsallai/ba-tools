import { v } from "convex/values";
import { GAME_SERVERS, PVP_SEASONS } from "@/lib/types";
import {
  formationRow,
  formationStudentItem,
  pvpFormationStudentItem,
  rosterItem,
  timelineSeparatorItem,
  timelineStudentItem,
  timelineTextItem,
} from "../schema";

const visibility = v.union(v.literal("private"), v.literal("public"));

const gameServer = v.union(...GAME_SERVERS.map((server) => v.literal(server)));

const pvpSeasonNumber = v.union(
  ...PVP_SEASONS.map((season) => v.literal(season)),
);

const pvpPresetMatchType = v.union(
  v.literal("attack"),
  v.literal("defense"),
  v.literal("both"),
);

const pvpMatchType = v.union(v.literal("attack"), v.literal("defense"));

const pvpMatchResult = v.union(v.literal("win"), v.literal("loss"));

export const formationArgs = {
  name: v.optional(v.string()),
  type: v.optional(
    v.union(
      v.literal("normal"),
      v.literal("finalRestrictionRelease"),
      v.literal("tacticalRelay"),
    ),
  ),
  strikers: v.array(formationStudentItem),
  specials: v.array(formationStudentItem),
  rows: v.optional(v.array(formationRow)),
  rowGap: v.optional(v.number()),
  displayOverline: v.optional(v.boolean()),
  noDisplayRole: v.optional(v.boolean()),
  groupsVertical: v.optional(v.boolean()),
};

export const timelineArgs = {
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  visibility: v.optional(visibility),
  showCreator: v.optional(v.boolean()),
  items: v.array(
    v.union(timelineStudentItem, timelineSeparatorItem, timelineTextItem),
  ),
  itemSpacing: v.optional(v.number()),
  verticalSeparatorSize: v.optional(v.number()),
  horizontalSeparatorSize: v.optional(v.number()),
  exportWithTransparentBackground: v.optional(v.boolean()),
  exportBackgroundColor: v.optional(v.string()),
  exportBackgroundOpacity: v.optional(v.number()),
};

export const timelineGroupCreateArgs = {
  name: v.string(),
  description: v.optional(v.string()),
  visibility,
  showCreator: v.optional(v.boolean()),
};

export const timelineGroupUpdateArgs = {
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  visibility: v.optional(visibility),
  showCreator: v.optional(v.boolean()),
  timelines: v.optional(v.array(v.id("timeline"))),
};

export const rosterCreateArgs = {
  name: v.optional(v.string()),
  introduction: v.optional(v.string()),
  accountLevel: v.number(),
  studentRepId: v.optional(v.string()),
  visibility,
  gameServer,
  friendCode: v.string(),
};

export const rosterUpdateArgs = {
  name: v.optional(v.string()),
  introduction: v.optional(v.string()),
  accountLevel: v.optional(v.number()),
  studentRepId: v.optional(v.string()),
  visibility: v.optional(visibility),
  gameServer: v.optional(gameServer),
  friendCode: v.optional(v.string()),
  students: v.optional(v.array(rosterItem)),
};

const giftCount = v.object({
  id: v.number(),
  count: v.number(),
});

export const giftInventoryArgs = {
  name: v.optional(v.string()),
  gifts: v.optional(v.array(giftCount)),
  giftBoxes: v.optional(v.number()),
};

export const giftTargetCreateArgs = {
  studentId: v.string(),
  currentExp: v.optional(v.number()),
  targetExp: v.optional(v.number()),
  gifts: v.optional(v.array(giftCount)),
  giftBoxCount: v.optional(v.number()),
};

export const giftTargetUpdateArgs = {
  ...giftTargetCreateArgs,
  studentId: v.optional(v.string()),
};

export const userPreferencesArgs = {
  timelineVisualizer: v.optional(
    v.object({
      triggerAutoFocus: v.optional(v.boolean()),
      defaultScale: v.optional(v.number()),
      defaultItemSpacing: v.optional(v.number()),
      defaultVerticalSeparatorSize: v.optional(v.number()),
      defaultHorizontalSeparatorSize: v.optional(v.number()),
      defaultExportWithTransparentBackground: v.optional(v.boolean()),
      defaultExportBackgroundColor: v.optional(v.string()),
      defaultExportBackgroundOpacity: v.optional(v.number()),
      defaultVisibility: v.optional(visibility),
      defaultShowCreator: v.optional(v.boolean()),
    }),
  ),
  formationDisplay: v.optional(
    v.object({
      defaultScale: v.optional(v.number()),
      defaultDisplayOverline: v.optional(v.boolean()),
      defaultNoDisplayRole: v.optional(v.boolean()),
      defaultGroupsVertical: v.optional(v.boolean()),
      defaultRowGap: v.optional(v.number()),
      defaultLevelEnabled: v.optional(v.boolean()),
      defaultLevel: v.optional(v.number()),
    }),
  ),
  bond: v.optional(
    v.object({
      autoPopulateSingleTargetGifts: v.optional(v.boolean()),
    }),
  ),
  pvp: v.optional(
    v.object({
      hideEmptyAgendaDays: v.optional(v.boolean()),
      includeMatchesInStatisticsByDefault: v.optional(v.boolean()),
    }),
  ),
};

export const recruitmentAccountArgs = {
  name: v.string(),
  gameServer,
  permanentCharge: v.number(),
  limitedCharge: v.number(),
};

export const recruitmentSessionArgs = {
  name: v.string(),
  date: v.number(),
  isFestBanner: v.boolean(),
  permanentStartCharge: v.number(),
  limitedStartCharge: v.number(),
  permanentPulls: v.number(),
  limitedPulls: v.number(),
  pickupsObtained: v.array(
    v.object({
      charge: v.number(),
      studentId: v.string(),
      kind: v.optional(v.union(v.literal("permanent"), v.literal("limited"))),
    }),
  ),
  threeStarCount: v.number(),
  rebateTicketsUsed: v.number(),
};

export const pvpSeasonArgs = {
  name: v.string(),
  gameServer,
  seasonNumber: pvpSeasonNumber,
};

export const pvpMatchCreateArgs = {
  date: v.number(),
  ownRank: v.optional(v.number()),
  opponentName: v.optional(v.string()),
  opponentStudentRepId: v.optional(v.string()),
  enemyPresetId: v.optional(v.id("pvpEnemyPreset")),
  autoCreateEnemyPreset: v.optional(v.boolean()),
  opponentRank: v.optional(v.number()),
  matchType: pvpMatchType,
  ownTeam: v.array(pvpFormationStudentItem),
  opponentTeam: v.array(pvpFormationStudentItem),
  result: pvpMatchResult,
  videoUrl: v.optional(v.string()),
  includeInStatistics: v.boolean(),
};

export const pvpMatchUpdateArgs = {
  date: v.optional(v.number()),
  ownRank: v.optional(v.number()),
  opponentName: v.optional(v.string()),
  opponentStudentRepId: v.optional(v.string()),
  enemyPresetId: v.optional(v.id("pvpEnemyPreset")),
  opponentRank: v.optional(v.number()),
  matchType: v.optional(pvpMatchType),
  ownTeam: v.optional(v.array(pvpFormationStudentItem)),
  opponentTeam: v.optional(v.array(pvpFormationStudentItem)),
  result: v.optional(pvpMatchResult),
  videoUrl: v.optional(v.string()),
  includeInStatistics: v.optional(v.boolean()),
};

export const pvpFormationPresetCreateArgs = {
  name: v.string(),
  matchType: pvpPresetMatchType,
  team: v.array(pvpFormationStudentItem),
  usedByMe: v.boolean(),
};

export const pvpFormationPresetUpdateArgs = {
  name: v.optional(v.string()),
  matchType: v.optional(pvpPresetMatchType),
  team: v.optional(v.array(pvpFormationStudentItem)),
  usedByMe: v.optional(v.boolean()),
};

export const pvpEnemyPresetCreateArgs = {
  name: v.string(),
  opponentName: v.optional(v.string()),
  opponentStudentRepId: v.optional(v.string()),
};

export const pvpEnemyPresetUpdateArgs = {
  ...pvpEnemyPresetCreateArgs,
  name: v.optional(v.string()),
};

export const pvpEnemyTeamCreateArgs = {
  enemyPresetId: v.optional(v.id("pvpEnemyPreset")),
  matchType: pvpPresetMatchType,
  team: v.array(pvpFormationStudentItem),
};

export const pvpEnemyTeamUpdateArgs = {
  matchType: v.optional(pvpPresetMatchType),
  team: v.optional(v.array(pvpFormationStudentItem)),
};
