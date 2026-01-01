export type RaidDuration = 180 | 240 | 290;

export const RAID_DURATIONS: {
  label: "3min" | "4min" | "4min30sec";
  value: RaidDuration;
  raids: string[];
}[] = [
  {
    label: "3min",
    value: 180,
    raids: ["binah", "kaiten"],
  },
  {
    label: "4min",
    value: 240,
    raids: [
      "chesed",
      "shirokuro",
      "hieronymus",
      "perorodzilla",
      "hod",
      "gregorius",
      "hovercraft",
      "kurokage",
      "geburah",
    ],
  },
  {
    label: "4min30sec",
    value: 290,
    raids: ["yesod"],
  },
];

export type RaidDifficulty =
  | "Normal"
  | "Hard"
  | "VeryHard"
  | "Hardcore"
  | "Extreme"
  | "Insane"
  | "Torment"
  | "Lunatic";

export type RaidDifficultyData = {
  difficulty: RaidDifficulty;
  name: string;
  difficultyScore: number;
  hpScore: Record<RaidDuration, number>;
  timeScoreMultiplier: number;
};

export const RAID_DIFFICULTY_DATA: RaidDifficultyData[] = [
  {
    difficulty: "Normal",
    name: "Normal",
    difficultyScore: 250000,
    hpScore: {
      180: 229000,
      240: 277000,
      290: 304700,
    },
    timeScoreMultiplier: 120,
  },
  {
    difficulty: "Hard",
    name: "Hard",
    difficultyScore: 500000,
    hpScore: {
      180: 458000,
      240: 554000,
      290: 609400,
    },
    timeScoreMultiplier: 240,
  },
  {
    difficulty: "VeryHard",
    name: "Very Hard",
    difficultyScore: 1000000,
    hpScore: {
      180: 916000,
      240: 1108000,
      290: 1218800,
    },
    timeScoreMultiplier: 480,
  },
  {
    difficulty: "Hardcore",
    name: "Hardcore",
    difficultyScore: 2000000,
    hpScore: {
      180: 1832000,
      240: 2216000,
      290: 2437600,
    },
    timeScoreMultiplier: 960,
  },
  {
    difficulty: "Extreme",
    name: "Extreme",
    difficultyScore: 4000000,
    hpScore: {
      180: 5392000,
      240: 6160000,
      290: 6578880,
    },
    timeScoreMultiplier: 1440,
  },
  {
    difficulty: "Insane",
    name: "Insane",
    difficultyScore: 6800000,
    hpScore: {
      180: 12449600,
      240: 14216000,
      290: 14941016,
    },
    timeScoreMultiplier: 1920,
  },
  {
    difficulty: "Torment",
    name: "Torment",
    difficultyScore: 12200000,
    hpScore: {
      180: 18876000,
      240: 19508000,
      290: 20302000,
    },
    timeScoreMultiplier: 2400,
  },
  {
    difficulty: "Lunatic",
    name: "Lunatic",
    difficultyScore: 17710000,
    hpScore: {
      180: 0,
      240: 26315000,
      290: 26954000,
    },
    timeScoreMultiplier: 2880,
  },
];

export function clearTimeToRaidScore(
  clearTimeSecs: number,
  duration: RaidDuration,
  difficulty: RaidDifficultyData,
): number | null {
  const delta = 3600 - clearTimeSecs;
  if (delta < 0) {
    return null;
  }

  return (
    difficulty.timeScoreMultiplier * delta +
    difficulty.difficultyScore +
    difficulty.hpScore[duration]
  );
}

export function raidScoreToClearTime(
  raidScore: number,
  duration: RaidDuration,
  difficulty: RaidDifficultyData,
): number {
  const baseScore = difficulty.difficultyScore + difficulty.hpScore[duration];
  const timeScore = raidScore - baseScore;

  return Math.min(3600, 3600 - timeScore / difficulty.timeScoreMultiplier);
}

export function secsToTimeString(secs: number): string {
  const mins = Math.floor(secs / 60);
  const secsWithoutMillis = Math.floor(secs % 60);
  const millis = secs - Math.floor(secs);

  const outputSecs = secsWithoutMillis.toString().padStart(2, "0");

  const millisStr = millis.toFixed(10).substring(2);
  const trimmedMillisStr = millisStr.replace(/0+$/, "");
  const outputMillis = trimmedMillisStr === "" ? "000" : trimmedMillisStr;

  return `${mins}:${outputSecs}.${outputMillis}`;
}
