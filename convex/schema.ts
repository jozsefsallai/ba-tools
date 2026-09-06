import {
  BORROW_SLOT_GAMEMODES,
  GAME_SERVERS,
  STAR_LEVELS,
  UE_LEVELS,
} from "@/lib/types";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const formationStudentItem = v.object({
  studentId: v.optional(v.string()),
  starter: v.optional(v.boolean()),
  starterOrder: v.optional(v.number()),
  starLevel: v.optional(
    v.union(...STAR_LEVELS.map((level) => v.literal(level))),
  ),
  ueLevel: v.optional(v.union(...UE_LEVELS.map((level) => v.literal(level)))),
  borrowed: v.optional(v.boolean()),
  level: v.optional(v.number()),
});

export const formationRowLabel = v.object({
  text: v.string(),
  side: v.union(v.literal("left"), v.literal("right")),
  fontSize: v.optional(v.number()),
  color: v.optional(v.string()),
  shadowEnabled: v.optional(v.boolean()),
  shadowColor: v.optional(v.string()),
  shadowOpacity: v.optional(v.number()),
  shadowOffsetX: v.optional(v.number()),
  shadowOffsetY: v.optional(v.number()),
  shadowBlur: v.optional(v.number()),
  shadowSpread: v.optional(v.number()),
  distance: v.optional(v.number()),
});

export const formationRow = v.object({
  strikers: v.array(formationStudentItem),
  specials: v.array(formationStudentItem),
  label: v.optional(formationRowLabel),
});

export const timelineStudentItem = v.object({
  type: v.literal("student"),
  studentId: v.string(),
  trigger: v.optional(v.string()),
  targetId: v.optional(v.string()),
  copy: v.optional(v.boolean()),
  variantId: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const timelineSeparatorOrientation = v.union(
  v.literal("horizontal"),
  v.literal("vertical"),
);

export const timelineSeparatorItem = v.object({
  type: v.literal("separator"),
  orientation: timelineSeparatorOrientation,
  size: v.optional(v.number()),
});

export const timelineTextItem = v.object({
  type: v.literal("text"),
  text: v.string(),
});

export const inventoryManagementItem = v.object({
  width: v.number(),
  height: v.number(),
  count: v.number(),
});

export const inventoryManagementCoords = v.object({
  x: v.number(),
  y: v.number(),
});

export const rosterItem = v.object({
  studentId: v.string(),
  starLevel: v.union(...STAR_LEVELS.map((level) => v.literal(level))),
  ueLevel: v.optional(v.union(...UE_LEVELS.map((level) => v.literal(level)))),
  level: v.number(),
  relationshipRank: v.number(),
  ex: v.number(),
  basic: v.number(),
  enhanced: v.number(),
  sub: v.number(),
  equipmentSlot1: v.optional(v.number()),
  equipmentSlot2: v.optional(v.number()),
  equipmentSlot3: v.optional(v.number()),
  equipmentSlot4: v.optional(v.number()),
  attackLevel: v.optional(v.number()),
  hpLevel: v.optional(v.number()),
  healLevel: v.optional(v.number()),
  featuredBorrowSlot: v.optional(
    v.union(...BORROW_SLOT_GAMEMODES.map((mode) => v.literal(mode))),
  ),
});

export const pvpFormationStudentItem = v.object({
  studentId: v.optional(v.string()),
  level: v.optional(v.number()),
  starLevel: v.optional(
    v.union(...STAR_LEVELS.map((level) => v.literal(level))),
  ),
  ueLevel: v.optional(v.union(...UE_LEVELS.map((level) => v.literal(level)))),
  damage: v.optional(v.number()),
});

const recruitmentAggregateBucket = v.object({
  sessionCount: v.number(),
  totalPulls: v.number(),
  paidPulls: v.number(),
  totalThreeStars: v.number(),
  totalPickups: v.number(),
  rebatePulls: v.number(),
  pyroxenesSaved: v.number(),
  softPityWins: v.number(),
  softPityLosses: v.number(),
  hardPities: v.number(),
  naturalPickups: v.number(),
  softWinPickups: v.number(),
  softLossPickups: v.number(),
  hardPityPickups: v.number(),
  pickupChargeHistogram: v.array(v.number()),
});

const recruitmentComputedStats = v.object({
  endCharge: v.number(),
  pickupCount: v.number(),
  softPityWins: v.number(),
  softPityLosses: v.number(),
  hardPities: v.number(),
  earnedRebateTickets: v.number(),
  rebateTicketsUsed: v.number(),
  remainingRebateTickets: v.number(),
  paidPulls: v.number(),
  experiencedThreeStarRate: v.number(),
  experiencedPURate: v.number(),
  pullsPerPU: v.optional(v.number()),
  pullsPerThreeStar: v.optional(v.number()),
  rebatePulls: v.number(),
  pyroxenesSpent: v.number(),
  pyroxenesSaved: v.number(),
  pickupClassifications: v.array(
    v.object({
      charge: v.number(),
      studentId: v.string(),
      classification: v.union(
        v.literal("beforeSoftPity"),
        v.literal("softWin"),
        v.literal("afterSoftPity"),
        v.literal("hardPity"),
        // Legacy values retained for existing computed statistics.
        v.literal("natural"),
        v.literal("afterSoftLoss"),
      ),
    }),
  ),
});

export const planaMessagePart = v.object({
  type: v.literal("text"),
  text: v.string(),
});

export const planaAssistantVariant = v.object({
  clientId: v.string(),
  parts: v.array(planaMessagePart),
  createdAt: v.number(),
});

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    username: v.string(),
    avatar: v.optional(v.string()),
    externalId: v.string(),
  }).index("by_externalId", ["externalId"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    timelineVisualizer: v.object({
      triggerAutoFocus: v.boolean(),
      defaultScale: v.number(),
      defaultItemSpacing: v.number(),
      defaultVerticalSeparatorSize: v.number(),
      defaultHorizontalSeparatorSize: v.number(),
      defaultExportWithTransparentBackground: v.optional(v.boolean()),
      defaultExportBackgroundColor: v.optional(v.string()),
      defaultExportBackgroundOpacity: v.optional(v.number()),
    }),
    formationDisplay: v.object({
      defaultScale: v.number(),
      defaultDisplayOverline: v.boolean(),
      defaultNoDisplayRole: v.boolean(),
      defaultGroupsVertical: v.boolean(),
      defaultRowGap: v.optional(v.number()),
    }),
    bond: v.optional(
      v.object({
        autoPopulateSingleTargetGifts: v.boolean(),
      }),
    ),
  }).index("by_userId", ["userId"]),

  formation: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(v.literal("normal"), v.literal("finalRestrictionRelease")),
    ),
    strikers: v.array(formationStudentItem),
    specials: v.array(formationStudentItem),
    rows: v.optional(v.array(formationRow)),
    rowGap: v.optional(v.number()),
    displayOverline: v.optional(v.boolean()),
    noDisplayRole: v.optional(v.boolean()),
    groupsVertical: v.optional(v.boolean()),
  }).index("by_userId", ["userId"]),

  timeline: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.union(v.literal("private"), v.literal("public")),
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
  }).index("by_userId", ["userId"]),

  timelineGroup: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    visibility: v.union(v.literal("private"), v.literal("public")),
    showCreator: v.optional(v.boolean()),
    timelines: v.array(v.id("timeline")),
  }).index("by_userId", ["userId"]),

  roster: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    introduction: v.optional(v.string()),
    accountLevel: v.number(),
    studentRepId: v.optional(v.string()),
    visibility: v.union(v.literal("private"), v.literal("public")),
    gameServer: v.union(...GAME_SERVERS.map((level) => v.literal(level))),
    friendCode: v.string(),
    students: v.array(rosterItem),
    lastUpdated: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_gameServerAndFriendCode", ["gameServer", "friendCode"]),

  inventoryManagementGrid: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    first: inventoryManagementItem,
    second: inventoryManagementItem,
    third: inventoryManagementItem,
    blockedCells: v.array(inventoryManagementCoords),
  }).index("by_userId", ["userId"]),

  giftInventory: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    gifts: v.array(
      v.object({
        id: v.number(),
        count: v.number(),
      }),
    ),
    giftBoxes: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  giftTarget: defineTable({
    userId: v.id("users"),
    giftInventoryId: v.id("giftInventory"),
    studentId: v.string(),
    currentExp: v.number(),
    targetExp: v.optional(v.number()),
    gifts: v.array(
      v.object({
        id: v.number(),
        enabled: v.optional(v.boolean()),
        count: v.optional(v.number()),
      }),
    ),
    useGiftBoxes: v.optional(v.boolean()),
    giftBoxCount: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_giftInventory", ["giftInventoryId"])
    .index("by_studentId", ["studentId"]),

  pvpSeason: defineTable({
    userId: v.id("users"),
    name: v.string(),
    gameServer: v.union(...GAME_SERVERS.map((level) => v.literal(level))),
  }).index("by_userId", ["userId"]),

  pvpFormationPreset: defineTable({
    userId: v.id("users"),
    seasonId: v.id("pvpSeason"),
    name: v.string(),
    matchType: v.optional(
      v.union(v.literal("attack"), v.literal("defense"), v.literal("both")),
    ),
    team: v.array(pvpFormationStudentItem),
    usedByMe: v.boolean(),
  })
    .index("by_seasonId", ["seasonId"])
    .index("by_userId_seasonId", ["userId", "seasonId"]),

  pvpEnemyPreset: defineTable({
    userId: v.id("users"),
    seasonId: v.id("pvpSeason"),
    name: v.string(),
    opponentName: v.optional(v.string()),
    opponentStudentRepId: v.optional(v.string()),
  })
    .index("by_seasonId", ["seasonId"])
    .index("by_userId_seasonId", ["userId", "seasonId"])
    .index("by_seasonId_opponentName", ["seasonId", "opponentName"]),

  pvpMatchRecord: defineTable({
    userId: v.id("users"),
    seasonId: v.id("pvpSeason"),
    date: v.number(),
    ownRank: v.optional(v.number()),
    opponentName: v.optional(v.string()),
    opponentStudentRepId: v.optional(v.string()),
    enemyPresetId: v.optional(v.id("pvpEnemyPreset")),
    opponentRank: v.optional(v.number()),
    matchType: v.union(v.literal("attack"), v.literal("defense")),
    ownTeam: v.array(pvpFormationStudentItem),
    opponentTeam: v.array(pvpFormationStudentItem),
    result: v.union(v.literal("win"), v.literal("loss")),
    videoUrl: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_seasonId", ["seasonId"])
    .index("by_seasonId_date", ["seasonId", "date"])
    .index("by_enemyPresetId_date", ["enemyPresetId", "date"]),

  recruitmentAccount: defineTable({
    userId: v.id("users"),
    name: v.string(),
    gameServer: v.union(...GAME_SERVERS.map((level) => v.literal(level))),

    // number of permanent charge points, auto-populated from the last session
    permanentCharge: v.number(),

    // number of limited charge points, auto-populated from the last session
    limitedCharge: v.number(),
    aggregates: v.optional(
      v.object({
        permanent: recruitmentAggregateBucket,
        limited: recruitmentAggregateBucket,
        fest: recruitmentAggregateBucket,
      }),
    ),
    latestPermanentSessionId: v.optional(v.id("recruitmentSession")),
    latestLimitedSessionId: v.optional(v.id("recruitmentSession")),
  }).index("by_userId", ["userId"]),

  recruitmentSession: defineTable({
    userId: v.id("users"),
    recruitmentAccountId: v.id("recruitmentAccount"),
    name: v.string(),
    date: v.number(),
    kind: v.union(v.literal("permanent"), v.literal("limited")),

    // whether this session took place on a fest banner with doubled 3★ rates
    isFestBanner: v.optional(v.boolean()),

    // number of rebate tickets left over from the previous pulling session
    rebateTicketsFromPreviousSession: v.number(),

    // manually adjustable number of rebate tickets used in this session
    rebateTicketsUsed: v.optional(v.number()),

    // number of charge points at the start of the session, generally auto
    // populated from the recruitment account
    startCharge: v.number(),

    // total number of pulls (including rebate tickets)
    totalPulls: v.number(),

    // list of PUs obtained in the session, including dupes + at what charge
    // you obtained them
    pickupsObtained: v.array(
      v.object({
        charge: v.number(),
        studentId: v.string(),
      }),
    ),

    threeStarCount: v.number(),
    computedStats: v.optional(recruitmentComputedStats),
  })
    .index("by_userId", ["userId"])
    .index("by_recruitmentAccountId", ["recruitmentAccountId"])
    .index("by_recruitmentAccountId_date", ["recruitmentAccountId", "date"]),

  donation: defineTable({
    supporterName: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    numberOfCoffees: v.optional(v.number()),
    supportNote: v.optional(v.string()),
    supportCreatedOn: v.number(),
    bmcSupportId: v.optional(v.string()),
    rawEvent: v.string(),
  })
    .index("by_supportCreatedOn", ["supportCreatedOn"])
    .index("by_bmcSupportId", ["bmcSupportId"]),

  planaChat: defineTable({
    userId: v.id("users"),
    title: v.string(),
    updatedAt: v.number(),
  }).index("by_userId_updatedAt", ["userId", "updatedAt"]),

  planaTurn: defineTable({
    chatId: v.id("planaChat"),
    userId: v.id("users"),
    order: v.number(),
    userClientId: v.string(),
    userParts: v.array(planaMessagePart),
    selectedVariantIndex: v.number(),
    assistantVariants: v.array(planaAssistantVariant),
  }).index("by_chatId_order", ["chatId", "order"]),
});
