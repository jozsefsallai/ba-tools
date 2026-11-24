import "server-only";

import { z } from "zod";
import commonEn from "@/i18n/translations/en/common.json";
import { ApiError } from "@/lib/public-api/response";
import {
  clearTimeToRaidScore,
  RAID_DIFFICULTY_DATA,
  RAID_DURATIONS,
  type RaidDifficulty,
  raidScoreToClearTime,
  secsToTimeString,
} from "@/lib/raids";
import { calculateStudentExpCapacity } from "@/lib/student-exp-table";

const MAX_CLEAR_TIME = 3600;
const MAX_TEAMS = 100;
const MAX_REPORTS = 999_999;
const MAX_STUDENT_LEVEL = 90;

const RAID_NAMES = commonEn.raids as Record<string, string>;

const DURATION_DOC = RAID_DURATIONS.map(
  ({ value, raids }) =>
    `${value} (${raids.map((raid) => RAID_NAMES[raid]).join(", ")})`,
).join(", ");

const BOSS_DOC = RAID_DURATIONS.flatMap(({ raids }) =>
  raids.map((raid) => `${raid} = ${RAID_NAMES[raid]}`),
).join(", ");

const TIME_DOC = "`min:sec.ms` (`3:25.5`) or seconds (`205.5`)";

export const raidScoreSchema = z.object({
  boss: z
    .string()
    .optional()
    .describe(
      `The boss, which sets the time limit. Not case-sensitive: ${BOSS_DOC}.`,
    ),
  duration: z.coerce
    .number()
    .optional()
    .describe(
      `The boss's time limit in seconds, instead of \`boss\`: ${DURATION_DOC}.`,
    ),
  difficulty: z
    .enum(
      RAID_DIFFICULTY_DATA.map(({ difficulty }) => difficulty) as [
        RaidDifficulty,
        ...RaidDifficulty[],
      ],
    )
    .describe("The difficulty."),
  clearTimes: z
    .array(z.string())
    .min(1)
    .max(MAX_TEAMS)
    .optional()
    .describe(
      `The time each team spent fighting, one entry per team, as ${TIME_DOC}. The total is at most 60 minutes.`,
    ),
  remainingTime: z
    .string()
    .optional()
    .describe(
      `The time left on the clock when a single team clears, as ${TIME_DOC}.`,
    ),
  score: z.coerce
    .number()
    .min(0)
    .optional()
    .describe("The score, to find the clear time it takes."),
});

function invalid(message: string) {
  return new ApiError("INVALID_REQUEST", message);
}

function resolveDuration(boss?: string, duration?: number) {
  const key = boss?.toLowerCase().replace(/[^a-z0-9]/g, "");

  const byBoss =
    key === undefined
      ? undefined
      : RAID_DURATIONS.find(({ raids }) =>
          raids.some(
            (raid) =>
              raid === key ||
              RAID_NAMES[raid].toLowerCase().replace(/[^a-z0-9]/g, "") === key,
          ),
        );

  if (key !== undefined && !byBoss) {
    throw invalid(`Unknown boss. Known bosses: ${BOSS_DOC}.`);
  }

  if (duration === undefined) {
    if (!byBoss) {
      throw invalid("Send the `boss` or its `duration`.");
    }

    return byBoss.value;
  }

  const byDuration = RAID_DURATIONS.find(({ value }) => value === duration);

  if (!byDuration) {
    throw invalid(`\`duration\` must be one of: ${DURATION_DOC}.`);
  }

  if (byBoss && byBoss !== byDuration) {
    throw invalid(
      `The boss's time limit is ${byBoss.value} seconds, not ${duration}.`,
    );
  }

  return byDuration.value;
}

function parseTime(value: string) {
  const match = /^(?:(\d{1,4}):([0-5]?\d(?:\.\d+)?)|(\d{1,6}(?:\.\d+)?))$/.exec(
    value.trim(),
  );

  if (!match) {
    throw invalid(`"${value}" isn't a time. Use ${TIME_DOC}.`);
  }

  const [, minutes, seconds, total] = match;

  return total === undefined
    ? Number(minutes) * 60 + Number(seconds)
    : Number(total);
}

/** Drops floating point noise, like the 0.30000000000000004 of 0.1 + 0.2. */
function roundTime(secs: number) {
  return Math.round(secs * 1e6) / 1e6;
}

export function calculateRaidScore({
  boss,
  duration: durationInput,
  difficulty: difficultyInput,
  clearTimes,
  remainingTime,
  score: scoreInput,
}: z.infer<typeof raidScoreSchema>) {
  const inputs = [
    clearTimes,
    remainingTime,
    scoreInput,
  ].filter((value) => value !== undefined);

  if (inputs.length !== 1) {
    throw invalid(
      "Send exactly one of `clearTimes`, `remainingTime` and `score`.",
    );
  }

  const duration = resolveDuration(boss, durationInput);
  const difficulty = RAID_DIFFICULTY_DATA.find(
    (entry) => entry.difficulty === difficultyInput,
  ) as (typeof RAID_DIFFICULTY_DATA)[number];

  let clearTime: number;

  if (clearTimes) {
    clearTime = clearTimes.reduce((sum, time) => sum + parseTime(time), 0);
  } else if (remainingTime !== undefined) {
    clearTime = duration - parseTime(remainingTime);

    if (clearTime < 0) {
      throw invalid(
        `\`remainingTime\` can't be more than the time limit of ${duration} seconds.`,
      );
    }
  } else {
    const score = scoreInput as number;
    const minScore = difficulty.difficultyScore + difficulty.hpScore[duration];
    const maxScore = minScore + difficulty.timeScoreMultiplier * MAX_CLEAR_TIME;

    if (score < minScore || score > maxScore) {
      throw invalid(
        `${difficulty.name} clears with this time limit score from ${minScore} to ${maxScore}. Check the difficulty and the boss.`,
      );
    }

    clearTime = raidScoreToClearTime(score, duration, difficulty);
  }

  clearTime = roundTime(clearTime);

  const score =
    scoreInput ?? clearTimeToRaidScore(clearTime, duration, difficulty);

  if (score === null) {
    throw invalid("The total clear time can't be more than 60 minutes.");
  }

  const remaining = roundTime(duration - clearTime);

  return {
    duration,
    difficulty: difficulty.difficulty,
    score: Math.round(score * 1000) / 1000,
    clearTime: secsToTimeString(clearTime),
    clearTimeSeconds: clearTime,
    // Only means something when one team cleared within the time limit.
    remainingTime:
      (clearTimes?.length ?? 1) === 1 && remaining >= 0
        ? secsToTimeString(remaining)
        : null,
  };
}

const reportCount = z.coerce.number().int().min(0).max(MAX_REPORTS).default(0);
const studentLevel = z.coerce.number().int().min(1).max(MAX_STUDENT_LEVEL);

export const studentExpSchema = z.object({
  fromLevel: studentLevel
    .default(1)
    .describe("Level the students start at (1-90). Defaults to 1."),
  toLevel: studentLevel
    .default(MAX_STUDENT_LEVEL)
    .describe("Level to raise the students to (1-90). Defaults to 90."),
  novice: reportCount.describe("Novice Activity Reports (N, 50 EXP each)."),
  normal: reportCount.describe("Normal Activity Reports (R, 500 EXP each)."),
  advanced: reportCount.describe(
    "Advanced Activity Reports (SR, 2,000 EXP each).",
  ),
  superior: reportCount.describe(
    "Superior Activity Reports (SSR, 10,000 EXP each).",
  ),
});

export function calculateStudentExp({
  fromLevel,
  toLevel,
  novice,
  normal,
  advanced,
  superior,
}: z.infer<typeof studentExpSchema>) {
  if (fromLevel >= toLevel) {
    throw invalid("`toLevel` must be higher than `fromLevel`.");
  }

  const { leftoverReports, ...result } = calculateStudentExpCapacity(
    {
      N: novice,
      R: normal,
      SR: advanced,
      SSR: superior,
    },
    fromLevel,
    toLevel,
  );

  return {
    fromLevel,
    toLevel,
    ...result,
    leftoverReports: {
      novice: leftoverReports.N,
      normal: leftoverReports.R,
      advanced: leftoverReports.SR,
      superior: leftoverReports.SSR,
    },
  };
}
