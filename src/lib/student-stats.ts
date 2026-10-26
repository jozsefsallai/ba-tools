export const STUDENT_MAX_LEVEL = 90;

const TRANSCENDENCE_TABLE = {
  atk: [0, 1000, 1200, 1400, 1700],
  maxHP: [0, 500, 700, 900, 1400],
  heal: [0, 750, 1000, 1200, 1500],
} as const;

export type StudentGrowthStats = {
  maxHP: [level1: number, level100: number];
  atk: [level1: number, level100: number];
  def: [level1: number, level100: number];
  heal: [level1: number, level100: number];
};

export type StudentStatValues = Record<keyof StudentGrowthStats, number>;

function getTranscendence(
  stat: keyof typeof TRANSCENDENCE_TABLE,
  starLevel: number,
) {
  let multiplier = 1;

  for (let i = 0; i < starLevel; ++i) {
    multiplier += TRANSCENDENCE_TABLE[stat][i] / 10000;
  }

  return multiplier;
}

function getStatForLevel(
  level: number,
  [level1, level100]: [number, number],
  transcendence = 1,
) {
  const scale = (level - 1) / 99;

  const base = Math.round(
    Number((level1 + (level100 - level1) * scale).toFixed(4)),
  );

  return Math.ceil(Number((base * transcendence).toFixed(4)));
}

export function getStudentStatsAtLevel(
  stats: StudentGrowthStats,
  level: number,
  starLevel: number,
): StudentStatValues {
  return {
    maxHP: getStatForLevel(
      level,
      stats.maxHP,
      getTranscendence("maxHP", starLevel),
    ),
    atk: getStatForLevel(level, stats.atk, getTranscendence("atk", starLevel)),
    def: getStatForLevel(level, stats.def),
    heal: getStatForLevel(
      level,
      stats.heal,
      getTranscendence("heal", starLevel),
    ),
  };
}
