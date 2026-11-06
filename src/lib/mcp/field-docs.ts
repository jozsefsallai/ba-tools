import "server-only";

import { z } from "zod";
import { colorEnum } from "@/lib/combat-colors";
import type { FieldDocs } from "@/lib/mcp/convex-to-zod";
import { describeEnumInput } from "@/lib/mcp/enrich.server";
import { DEFENSE_TYPES } from "@/lib/raid-info";
import { skillCardVariantMap } from "@/lib/skill-card";
import { BORROW_SLOT_GAMEMODE_NAMES, GAME_SERVER_NAMES } from "@/lib/types";
import type {
  formationArgs,
  giftInventoryArgs,
  giftTargetCreateArgs,
  giftTargetUpdateArgs,
  pvpEnemyPresetCreateArgs,
  pvpEnemyPresetUpdateArgs,
  pvpEnemyTeamCreateArgs,
  pvpEnemyTeamUpdateArgs,
  pvpFormationPresetCreateArgs,
  pvpFormationPresetUpdateArgs,
  pvpMatchCreateArgs,
  pvpMatchUpdateArgs,
  pvpSeasonArgs,
  recruitmentAccountArgs,
  recruitmentSessionArgs,
  rosterCreateArgs,
  rosterUpdateArgs,
  timelineArgs,
  timelineGroupCreateArgs,
  timelineGroupUpdateArgs,
  userPreferencesArgs,
} from "~convex-lib/validators";

const STUDENT_ID = "Student id from `search_students`.";

const VISIBILITY =
  "`private`, or `public` so anyone with the link can view it.";

const SHOW_CREATOR = "Show the user's name on the public page.";

const AUTO_NAME =
  "Lets the app keep the name generated from the content up to date. Sending `name` turns it off unless this is also sent.";

export const GAME_SERVER_DOC = `Game server: ${Object.entries(GAME_SERVER_NAMES)
  .map(([server, name]) => `${server} = ${name}`)
  .join(", ")}.`;

const CSS_COLOR = "Hex color, like `#ffffff`.";

const STAR_LEVEL = "Star rating (5 is the maximum).";
const UE_LEVEL = "Unique Equipment (UE) star level.";

const FROM_PREFERENCE = "Left out on create, this uses the user's preference.";

const raidDocs = {
  about:
    "Tags the content with a raid, which also makes it findable by raid. Send `null` to clear it.",
  fields: {
    type: "Raid = Total Assault, EliminateRaid = Grand Assault, MultiFloorRaid = Final Restriction Release, TimeAttackDungeon = Joint Firing Drill, WorldRaid = Allied Operation.",
    boss: "Must belong to `type`: a boss, or a drill type for TimeAttackDungeon.",
    defenseTypes: {
      about: `Armor types. ${describeEnumInput("defenseType")}`,
      schema: z.array(colorEnum(DEFENSE_TYPES)),
    },
    terrains: describeEnumInput("terrain"),
    difficulty:
      "Only for Raid and, on timelines, EliminateRaid; anything else is rejected.",
    floor:
      "Whole number from 1 to 124. Only for MultiFloorRaid on timelines; anything else is rejected.",
    season: {
      about: "The specific run of this raid. Usually left out.",
      fields: {
        id: "Season id.",
        startDate: "Start date.",
        endDate: "End date.",
      },
    },
  },
};

const formationStudentDocs = {
  studentId: `${STUDENT_ID} Leave it out for an empty slot.`,
  starter:
    "Marks this student's skill as a starter skill, used at the start of the battle. Up to 5 per row, or 9 for Final Restriction Release.",
  starterOrder:
    "The starter skill's position in the opening order, from 1. Without it, starters go in slot order.",
  starLevel: STAR_LEVEL,
  ueLevel: UE_LEVEL,
  borrowed: "Marks the student as borrowed from another player.",
  level:
    "Student level shown on the card (up to 90). Left out for a student new to the formation, it uses the user's default level if they have that preference on.",
};

const formationRowLabelDocs = {
  about: "Text shown beside the row, such as a team or phase name.",
  fields: {
    text: "The label text.",
    side: "The side of the row to show it on.",
    fontSize: "Font size in pixels.",
    color: CSS_COLOR,
    shadowEnabled: "Draw a shadow behind the text.",
    shadowColor: CSS_COLOR,
    shadowOpacity: "Shadow opacity.",
    shadowOffsetX: "Shadow X offset in pixels.",
    shadowOffsetY: "Shadow Y offset in pixels.",
    shadowBlur: "Shadow blur in pixels.",
    shadowSpread: "Shadow spread in pixels.",
    distance: "Gap between the label and the row in pixels.",
  },
};

const FORMATION_TYPE =
  "`normal` (default, up to 4 strikers and 2 specials per row), `finalRestrictionRelease` (up to 6 strikers and 4 specials per row), or `tacticalRelay` (Simulated Aptitude Test: up to 4 strikers, 2 specials, plus `tcs` slots). When left out, the app detects `normal` or `finalRestrictionRelease` from the slot counts.";

const formationRowDocs = {
  strikers: {
    about: "Striker slots, in order.",
    fields: formationStudentDocs,
  },
  specials: {
    about: "Special slots, in order.",
    fields: formationStudentDocs,
  },
  tcs: {
    about:
      "The third slot group of a `tacticalRelay` formation. Not shown for other types.",
    fields: formationStudentDocs,
  },
  label: formationRowLabelDocs,
};

const FORMATION_ROW_GAP = "Space between rows in pixels.";
const FORMATION_OVERLINE =
  "Draw the colored line above the striker and special groups.";
const FORMATION_NO_ROLE = "Hide the role icon on the student cards.";
const FORMATION_VERTICAL = "Stack the groups in each row vertically.";

export const formationDocs: FieldDocs<typeof formationArgs> = {
  name: "Formation name, 1-100 characters.",
  type: FORMATION_TYPE,
  strikers: {
    about:
      "First row's striker slots, in order. Required even when `rows` is sent; use the same slots as `rows[0]`.",
    fields: formationStudentDocs,
  },
  specials: {
    about:
      "First row's special slots, in order. Required even when `rows` is sent; use the same slots as `rows[0]`.",
    fields: formationStudentDocs,
  },
  rows: {
    about:
      "All rows, for formations with several teams. When not empty, this is what the app shows, so it must include the first row too.",
    fields: formationRowDocs,
  },
  rowGap: `${FORMATION_ROW_GAP} ${FROM_PREFERENCE}`,
  displayOverline: `${FORMATION_OVERLINE} ${FROM_PREFERENCE}`,
  noDisplayRole: `${FORMATION_NO_ROLE} ${FROM_PREFERENCE}`,
  groupsVertical: `${FORMATION_VERTICAL} ${FROM_PREFERENCE}`,
};

const VARIANTS = Object.entries(skillCardVariantMap)
  .map(
    ([studentId, variants]) =>
      `${studentId}: ${variants.map(({ id }) => id).join(", ")}`,
  )
  .join("; ");

export const timelineDocs: FieldDocs<typeof timelineArgs> = {
  name: "Timeline name. Sent names are kept as they are; see `autoName`.",
  description:
    "Longer explanation shown with the timeline, such as strategy or requirements.",
  visibility: `${VISIBILITY} ${FROM_PREFERENCE} Check \`get_preferences\` or set it explicitly if it matters.`,
  showCreator: `${SHOW_CREATOR} ${FROM_PREFERENCE}`,
  items: {
    about:
      "The rotation, in order. Each item's `type` decides which of the other fields apply.",
    fields: {
      type: "`student` is a skill card (one EX skill use), `separator` adds a gap or new row, `text` is a standalone label.",
      studentId: `\`student\` items: the student using the skill. ${STUDENT_ID}`,
      trigger:
        "`student` items: when to use the skill, shown as a badge on the card. Use it for the cost or battle time, like `3`, `3c`, `2:45.900` or `Cost Down`. Costs and timings belong here, never in `notes`.",
      targetId: `\`student\` items: the student the skill is aimed at, shown on the card. ${STUDENT_ID}`,
      extraTargetIds:
        "`student` items: further targets when the skill hits several students (up to 9, for 10 in total with `targetId`). Don't repeat `targetId`.",
      copy: "`student` items: marks the card as a copied skill card, shown with a copy glow. Use it when the skill is used through a copy of the card rather than the student's original.",
      variantId: `\`student\` items: alternate skill card art. Only these students have any: ${VARIANTS}.`,
      notes:
        "`student` items: a few words shown under the card, such as `after boss shield`. New lines are allowed. Long notes push the next cards far apart.",
      highlightColor:
        "`student` items: makes the card glow in this hex color, like `#ef4444`, to call attention to it.",
      orientation:
        "`separator` items: `vertical` starts a new row; `horizontal` adds a gap within the row.",
      size: "`separator` items: size in pixels, instead of the timeline's size for that orientation.",
      text: "`text` items: the label, such as a phase name.",
    },
  },
  itemSpacing: `Space between items in pixels. ${FROM_PREFERENCE}`,
  verticalSeparatorSize: `Space added by \`vertical\` separators in pixels. ${FROM_PREFERENCE}`,
  horizontalSeparatorSize: `Width of \`horizontal\` separators in pixels. ${FROM_PREFERENCE}`,
  exportWithTransparentBackground: `Export the timeline image without a background. ${FROM_PREFERENCE}`,
  exportBackgroundColor: `Export background. ${CSS_COLOR} ${FROM_PREFERENCE}`,
  exportBackgroundOpacity: `Export background opacity, 0-100. ${FROM_PREFERENCE}`,
  formation: {
    about:
      "The team to show with the timeline. It's the timeline's own copy and is public whenever the timeline is.",
    fields: {
      name: "Formation name.",
      type: FORMATION_TYPE,
      rows: {
        about: "The team's rows; usually one.",
        fields: formationRowDocs,
      },
      rowGap: `${FORMATION_ROW_GAP} Uses the user's preference when left out.`,
      displayOverline: `${FORMATION_OVERLINE} Uses the user's preference when left out.`,
      noDisplayRole: `${FORMATION_NO_ROLE} Uses the user's preference when left out.`,
      groupsVertical: `${FORMATION_VERTICAL} Uses the user's preference when left out.`,
    },
  },
  formationId:
    "Links the copy in `formation` to one of the user's saved formations. This doesn't fill in `formation`, so send both.",
  exportIncludeFormation: "Include the formation in the exported image.",
  raid: raidDocs,
  autoName: AUTO_NAME,
};

const timelineGroupSharedDocs = {
  description: "Longer explanation shown with the group.",
  showCreator: SHOW_CREATOR,
  raid: raidDocs,
  autoName: AUTO_NAME,
};

export const timelineGroupCreateDocs: FieldDocs<
  typeof timelineGroupCreateArgs
> = {
  ...timelineGroupSharedDocs,
  name: "Group name.",
  visibility: VISIBILITY,
};

export const timelineGroupUpdateDocs: FieldDocs<
  typeof timelineGroupUpdateArgs
> = {
  ...timelineGroupSharedDocs,
  name: "Group name.",
  visibility: VISIBILITY,
  timelines: "The user's timeline ids, in display order.",
};

const rosterSharedDocs = {
  name: "Roster name.",
  introduction: "Text shown on the roster's page.",
  accountLevel: "The game account's level, 1-90.",
  studentRepId: `The student representing the account. ${STUDENT_ID}`,
  visibility:
    "`public` lets anyone find the roster by game server and friend code.",
  gameServer: GAME_SERVER_DOC,
  friendCode:
    "The account's friend code: 8 uppercase letters (A-Z), unique per game server.",
};

export const rosterCreateDocs: FieldDocs<typeof rosterCreateArgs> =
  rosterSharedDocs;

export const rosterUpdateDocs: FieldDocs<typeof rosterUpdateArgs> = {
  ...rosterSharedDocs,
  students: {
    about: "The students the account owns and how far each is built.",
    fields: {
      studentId: STUDENT_ID,
      starLevel: STAR_LEVEL,
      ueLevel: UE_LEVEL,
      level: "Student level, 1-90.",
      relationshipRank: "Relationship (bond) rank, 1-100.",
      ex: "EX skill level, 1-5.",
      basic: "Basic skill level, 1-10.",
      enhanced: "Enhanced skill level, 1-10.",
      sub: "Sub skill level, 1-10.",
      equipmentSlot1: "First equipment slot's tier, 0-10 (0 = empty).",
      equipmentSlot2: "Second equipment slot's tier, 0-10 (0 = empty).",
      equipmentSlot3: "Third equipment slot's tier, 0-10 (0 = empty).",
      equipmentSlot4: "Bond item's tier, 0-2 (0 = none).",
      attackLevel: "Attack talent level, 0-25.",
      hpLevel: "HP talent level, 0-25.",
      healLevel: "Healing talent level, 0-25.",
      featuredBorrowSlot: `Features the student as borrowable in a game mode: ${Object.entries(
        BORROW_SLOT_GAMEMODE_NAMES,
      )
        .map(([mode, name]) => `${mode} = ${name}`)
        .join(", ")}.`,
    },
  },
};

const giftCountDocs = {
  id: "Gift id from `search_gifts`.",
  count: "How many.",
};

export const giftInventoryDocs: FieldDocs<typeof giftInventoryArgs> = {
  name: "Inventory name.",
  gifts: {
    about: "The gifts the user owns.",
    fields: giftCountDocs,
  },
  giftBoxes: "How many gift boxes the user owns.",
};

const giftTargetDocs = {
  studentId: `${STUDENT_ID} An inventory has one target per student.`,
  currentExp: "The student's current relationship EXP.",
  targetExp: "The relationship EXP to reach.",
  gifts: {
    about: "The gifts planned for this student.",
    fields: giftCountDocs,
  },
  giftBoxCount: "The gift boxes planned for this student.",
};

export const giftTargetCreateDocs: FieldDocs<typeof giftTargetCreateArgs> =
  giftTargetDocs;

export const giftTargetUpdateDocs: FieldDocs<typeof giftTargetUpdateArgs> =
  giftTargetDocs;

export const userPreferencesDocs: FieldDocs<typeof userPreferencesArgs> = {
  timelineVisualizer: {
    about:
      "Defaults for new timelines, in the timeline editor and `create_timeline`.",
    fields: {
      triggerAutoFocus:
        "Focus the trigger field after picking a student in the editor.",
      defaultScale: "Preview scale, where 1 is 100%.",
      defaultItemSpacing: "Space between items in pixels.",
      defaultVerticalSeparatorSize: "Vertical separator size in pixels.",
      defaultHorizontalSeparatorSize: "Horizontal separator size in pixels.",
      defaultExportWithTransparentBackground:
        "Export images without a background.",
      defaultExportBackgroundColor: `Export background. ${CSS_COLOR}`,
      defaultExportBackgroundOpacity: "Export background opacity, 0-100.",
      defaultVisibility: "Visibility of new timelines.",
      defaultShowCreator: "Show the user's name on new public timelines.",
    },
  },
  formationDisplay: {
    about:
      "Defaults for new formations, in the formation editor and `create_formation`, and for formations on timelines.",
    fields: {
      defaultScale: "Preview scale, where 1 is 100%.",
      defaultDisplayOverline: FORMATION_OVERLINE,
      defaultNoDisplayRole: FORMATION_NO_ROLE,
      defaultGroupsVertical: FORMATION_VERTICAL,
      defaultRowGap: FORMATION_ROW_GAP,
      defaultLevelEnabled: "Set newly added students to `defaultLevel`.",
      defaultLevel: "The level for newly added students, 1-90.",
    },
  },
  bond: {
    about: "Relationship rank calculator settings.",
    fields: {
      autoPopulateSingleTargetGifts:
        "When an inventory has one target, changing a gift's total also plans that amount for the target.",
    },
  },
  pvp: {
    about: "PvP tracker settings.",
    fields: {
      hideEmptyAgendaDays: "Hide agenda days without recorded matches.",
      includeMatchesInStatisticsByDefault:
        "Include new matches in the public statistics by default, including through `create_pvp_match`.",
    },
  },
};

export const recruitmentAccountDocs: FieldDocs<typeof recruitmentAccountArgs> =
  {
    name: "Account name.",
    gameServer: GAME_SERVER_DOC,
    permanentCharge: "Current charge (pity count) on permanent banners, 0-200.",
    limitedCharge: "Current charge (pity count) on limited banners, 0-200.",
  };

export const recruitmentSessionDocs: FieldDocs<typeof recruitmentSessionArgs> =
  {
    name: "Session name, usually the banner.",
    date: "Unix timestamp in milliseconds. New sessions can't be dated before an account's existing ones.",
    isFestBanner: "Whether this was a Fest banner (double 3★ rate).",
    permanentStartCharge:
      "Charge on the permanent banner when the session started, 0-200.",
    limitedStartCharge:
      "Charge on limited banners when the session started, 0-200.",
    permanentPulls: "Pulls on the permanent banner, including rebate tickets.",
    limitedPulls: "Pulls on limited banners, including rebate tickets.",
    pickupsObtained: {
      about: "Each pickup student obtained, in the order they were pulled.",
      fields: {
        charge:
          "The charge when the pickup came, up to 200. The first must be above the starting charge. Charge resets after a pickup, so each later one counts from 0 and needs to fit in the session's pulls.",
        studentId: STUDENT_ID,
        kind: "The banner pool it came from.",
      },
    },
    threeStarCount:
      "All 3★ students obtained, pickups included, so at least as many as `pickupsObtained`.",
    rebateTicketsUsed:
      "Rebate tickets spent in the session; at most one per 10 pulls, and no more than are available.",
  };

export const pvpSeasonDocs: FieldDocs<typeof pvpSeasonArgs> = {
  name: "Season name, not empty.",
  gameServer: GAME_SERVER_DOC,
  seasonNumber: "The Tactical Challenge season number.",
};

const pvpStudentDocs = {
  studentId: `${STUDENT_ID} Leave it out for an empty slot.`,
  level: "Student level (up to 90).",
  starLevel: STAR_LEVEL,
  ueLevel: UE_LEVEL,
  damage: "Damage the student dealt in this battle.",
};

const PVP_MATCH_TEAM =
  "Exactly six slots in order (four strikers, then two specials), with at least one striker and no student twice.";

const pvpMatchDocs = {
  date: "When it was played, as Unix ms.",
  ownRank: "The user's rank at the time.",
  opponentName: "The opponent's player name.",
  opponentStudentRepId: `The opponent's representative student. ${STUDENT_ID}`,
  enemyPresetId:
    "Files the match under this tracked opponent from `list_pvp_enemy_presets`.",
  opponentRank: "The opponent's rank at the time.",
  matchType:
    "`attack` if the user attacked the opponent's defense, `defense` if the user's defense was attacked.",
  ownTeam: {
    about: `The user's team. ${PVP_MATCH_TEAM}`,
    fields: pvpStudentDocs,
  },
  opponentTeam: {
    about: `The opponent's team. ${PVP_MATCH_TEAM}`,
    fields: pvpStudentDocs,
  },
  result: "The result from the user's side.",
  videoUrl: "Link to a recording; must be http or https.",
  includeInStatistics:
    "Add the match to the public statistics. Only the ordered teams and result are used, anonymously; updates can take up to six hours.",
};

export const pvpMatchCreateDocs: FieldDocs<typeof pvpMatchCreateArgs> = {
  ...pvpMatchDocs,
  includeInStatistics: {
    about: `${pvpMatchDocs.includeInStatistics} ${FROM_PREFERENCE}`,
    schema: z.boolean().optional(),
  },
  autoCreateEnemyPreset:
    "Files the match under the enemy preset named `opponentName`, creating it if needed. Needs `opponentName`; ignored with `enemyPresetId`.",
};

export const pvpMatchUpdateDocs: FieldDocs<typeof pvpMatchUpdateArgs> =
  pvpMatchDocs;

const PVP_PRESET_MATCH_TYPE = "What the team is for.";

const PVP_PRESET_TEAM =
  "Six slots in order (four strikers, then two specials), with at least one student.";

const pvpFormationPresetDocs = {
  name: "Team name.",
  matchType: PVP_PRESET_MATCH_TYPE,
  team: {
    about: PVP_PRESET_TEAM,
    fields: pvpStudentDocs,
  },
  usedByMe:
    "Whether the user plays this team themselves; `false` for a team kept for reference.",
};

export const pvpFormationPresetCreateDocs: FieldDocs<
  typeof pvpFormationPresetCreateArgs
> = pvpFormationPresetDocs;

export const pvpFormationPresetUpdateDocs: FieldDocs<
  typeof pvpFormationPresetUpdateArgs
> = pvpFormationPresetDocs;

const pvpEnemyPresetDocs = {
  name: "The name to track the opponent under.",
  opponentName: "The opponent's player name.",
  opponentStudentRepId: `The opponent's representative student. ${STUDENT_ID}`,
};

export const pvpEnemyPresetCreateDocs: FieldDocs<
  typeof pvpEnemyPresetCreateArgs
> = pvpEnemyPresetDocs;

export const pvpEnemyPresetUpdateDocs: FieldDocs<
  typeof pvpEnemyPresetUpdateArgs
> = pvpEnemyPresetDocs;

const pvpEnemyTeamDocs = {
  matchType: "Whether the opponent used the team to attack, defend, or both.",
  team: {
    about: PVP_PRESET_TEAM,
    fields: pvpStudentDocs,
  },
};

export const pvpEnemyTeamCreateDocs: FieldDocs<typeof pvpEnemyTeamCreateArgs> =
  {
    ...pvpEnemyTeamDocs,
    enemyPresetId:
      "The tracked opponent from `list_pvp_enemy_presets` that used it.",
  };

export const pvpEnemyTeamUpdateDocs: FieldDocs<typeof pvpEnemyTeamUpdateArgs> =
  pvpEnemyTeamDocs;
