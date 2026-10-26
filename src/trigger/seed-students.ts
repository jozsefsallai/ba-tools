import { type Task, logger, task } from "@trigger.dev/sdk";
import { db } from "../lib/db";
import type { SkillType } from "../lib/db/client";
import {
  type NameOverride,
  type RawEffect,
  type RawStudentData,
  type RawStudentSkillsData,
  type SeedStudentInput,
  StudentLimitedType,
  fetchStudentsData,
  fetchStudentsDataJP,
  fetchStudentsDataKR,
  fetchStudentsDataTH,
  fetchStudentsDataTW,
} from "./lib/common";
import { type SeedStudentsPayload, seedStudentsPayload } from "./schemas";

const KNOCKBACK_RE = /<kb:(\d+)>/g;
const BUFFNAME_RE = /<([bcds])*:([a-zA-Z0-9_]+)>/g;
const PARAMS_RE = /<\?(\d)+>/g;

function kindToLocalizeKey(kind: string): string {
  switch (kind) {
    case "b":
      return "Buff";
    case "c":
      return "CC";
    case "d":
      return "Debuff";
    case "s":
      return "Special";
    default:
      throw new Error(`Unknown buff kind: ${kind}`);
  }
}

function serializeSkillDescription(
  template: string,
  params: Array<string[]>,
  effects: RawEffect[] = [],
): string {
  let output = template
    .split("<b>")
    .join("**")
    .split("</b>")
    .join("**")
    .split("<i>")
    .join("*")
    .split("</i>")
    .join("*")
    .split(/<br\s?\/?>/g)
    .join("\n");

  output = output.replace(KNOCKBACK_RE, (_, val) => {
    const knockbackEffect = effects.filter((e) => e.Type === "Knockback")[
      val - 1
    ];

    if (!knockbackEffect) {
      return `**${val}**`;
    }

    const lowerBound = knockbackEffect.Scale[0];
    const upperBound = knockbackEffect.Scale[knockbackEffect.Scale.length - 1];

    const paramString =
      lowerBound === upperBound
        ? `**${lowerBound * 2} units**`
        : `**${lowerBound * 2}~${upperBound * 2} units**`;

    return paramString;
  });

  output = output.replace(PARAMS_RE, (_, idx) => {
    const paramValue = params[Number.parseInt(idx, 10) - 1];
    const lowerBound = paramValue.find(
      (v) => typeof v !== "undefined" && v !== null,
    );
    const upperBound = paramValue[paramValue.length - 1];

    if (lowerBound === "") {
      const firstValueIndex = paramValue.findIndex(
        (v) => typeof v !== "undefined" && v !== null && v !== "",
      );

      const paramString = ` **${upperBound.trim()} ${firstValueIndex < 4 ? `(level ${firstValueIndex + 1} and above)` : `(level ${firstValueIndex + 1})`}**`;
      return paramString;
    }

    const paramString =
      lowerBound === upperBound
        ? `**${lowerBound}**`
        : `**${lowerBound}~${upperBound}**`;
    return paramString;
  });

  // TODO: make the descriptions localizable
  output = output.replace(BUFFNAME_RE, (_, kind, name) => {
    const prefix = kindToLocalizeKey(kind);
    return `buffName.${prefix}_${name}`;
  });

  return output;
}

function serializeCost(cost?: number[]): string | null {
  if (!cost) {
    return null;
  }

  const uniqueCosts = Array.from(new Set(cost))
    .filter((v) => typeof v !== "undefined" && v !== null)
    .sort()
    .map((v) => v.toString());

  if (uniqueCosts.length === 0) {
    return null;
  }

  if (uniqueCosts.length === 1) {
    return uniqueCosts[0];
  }

  const min = uniqueCosts[0];
  const max = uniqueCosts[uniqueCosts.length - 1];
  return `${min}~${max}`;
}

async function seedSkills(studentId: string, skillData: RawStudentSkillsData) {
  const { Ex, Public, Passive, ExtraPassive } = skillData;

  await db.skill.createMany({
    data: [
      {
        name: Ex.Name,
        description: serializeSkillDescription(
          Ex.Desc,
          Ex.Parameters,
          Ex.Effects,
        ),
        type: "EX",
        cost: serializeCost(Ex.Cost),
        studentId,
      },
      ...(Ex.ExtraSkills ?? []).map((extraSkill) => ({
        name: extraSkill.Name,
        description: serializeSkillDescription(
          extraSkill.Desc,
          extraSkill.Parameters,
          extraSkill.Effects,
        ),
        type: "EX" as SkillType,
        cost: serializeCost(extraSkill.Cost),
        studentId,
      })),
      {
        name: Public.Name,
        description: serializeSkillDescription(
          Public.Desc,
          Public.Parameters,
          Public.Effects,
        ),
        type: "Basic",
        cost: null,
        studentId,
      },
      {
        name: Passive.Name,
        description: serializeSkillDescription(
          Passive.Desc,
          Passive.Parameters,
          Passive.Effects,
        ),
        type: "Enhanced",
        cost: null,
        studentId,
      },
      {
        name: ExtraPassive.Name,
        description: serializeSkillDescription(
          ExtraPassive.Desc,
          ExtraPassive.Parameters,
          ExtraPassive.Effects,
        ),
        type: "Sub",
        cost: null,
        studentId,
      },
    ],
  });
}

function sortAltsLast(isAlt: (student: SeedStudentInput) => boolean) {
  return (a: SeedStudentInput, b: SeedStudentInput) =>
    Number(isAlt(a)) - Number(isAlt(b));
}

const BASE_VARIANT_OVERRIDES: Record<string, string> = {
  shunling_swimsuit: "shun",
};

function findBaseVariantId(
  alt: SeedStudentInput,
  students: SeedStudentInput[],
  isAlt: (student: SeedStudentInput) => boolean,
): string | null {
  const override = BASE_VARIANT_OVERRIDES[alt.PathName];
  if (override) {
    return override;
  }

  let base: string | null = null;

  for (const student of students) {
    if (
      !isAlt(student) &&
      alt.PathName.startsWith(`${student.PathName}_`) &&
      student.PathName.length > (base?.length ?? 0)
    ) {
      base = student.PathName;
    }
  }

  return base;
}

type StudentNameSource = Pick<RawStudentData, "PathName" | "Name">;

function getStudentName(student: StudentNameSource): string {
  if (student.PathName === "hoshino_battle_dealer") {
    return `${student.Name} / Dealer`;
  }

  if (student.PathName === "hoshino_battle_tank") {
    return `${student.Name} / Tank`;
  }

  if (student.PathName === "shunling_swimsuit") {
    return "Shunling (Swimsuit)";
  }

  return student.Name;
}

function getStudentNameJP(student?: StudentNameSource): string {
  if (!student) {
    return "";
  }

  if (student.PathName === "hoshino_battle_dealer") {
    return `${student.Name} / アタッカー`;
  }

  if (student.PathName === "hoshino_battle_tank") {
    return `${student.Name} / タンク`;
  }

  if (student.PathName === "shunling_swimsuit") {
    return "シュエリン（水着）";
  }

  return student.Name;
}

function getStudentNameKR(student?: StudentNameSource): string {
  if (!student) {
    return "";
  }

  if (student.PathName === "hoshino_battle_dealer") {
    return `${student.Name} / 딜러`;
  }

  if (student.PathName === "hoshino_battle_tank") {
    return `${student.Name} / 탱커`;
  }

  if (student.PathName === "shunling_swimsuit") {
    return "슈에링(수영복)";
  }

  return student.Name;
}

function getStudentNameTW(student?: StudentNameSource): string {
  if (!student) {
    return "";
  }

  if (student.PathName === "hoshino_battle_dealer") {
    return `${student.Name} / 輸出`;
  }

  if (student.PathName === "hoshino_battle_tank") {
    return `${student.Name} / 坦克`;
  }

  if (student.PathName === "shunling_swimsuit") {
    return "小旬（泳裝）";
  }

  return student.Name;
}

function getStudentNameTH(student?: StudentNameSource): string {
  if (!student) {
    return "";
  }

  if (student.PathName === "hoshino_battle_dealer") {
    return `${student.Name} / アタッカー`;
  }

  if (student.PathName === "hoshino_battle_tank") {
    return `${student.Name} / タンク`;
  }

  if (student.PathName === "shunling_swimsuit") {
    return "シュエリン（水着）";
  }

  return student.Name;
}

type StudentNames = {
  name: string;
  firstName: string;
  lastName: string;
  nameJP: string;
  firstNameJP: string;
  lastNameJP: string;
  nameKR: string;
  firstNameKR: string;
  lastNameKR: string;
  nameTW: string;
  firstNameTW: string;
  lastNameTW: string;
  nameTH: string;
  firstNameTH: string;
  lastNameTH: string;
};

const EMPTY_NAME: NameOverride = { name: "", firstName: "", lastName: "" };

function namesFromOverrides(data: SeedStudentInput): StudentNames {
  const fallback: NameOverride = {
    name: data.Name,
    firstName: data.PersonalName,
    lastName: data.FamilyName,
  };
  const overrides = data.__nameOverrides ?? {};
  const en = overrides.en ?? fallback;
  const jp = overrides.jp ?? fallback;
  const kr = overrides.kr ?? EMPTY_NAME;
  const tw = overrides.tw ?? EMPTY_NAME;
  const th = overrides.th ?? EMPTY_NAME;

  return {
    name: en.name,
    firstName: en.firstName,
    lastName: en.lastName,
    nameJP: jp.name,
    firstNameJP: jp.firstName,
    lastNameJP: jp.lastName,
    nameKR: kr.name,
    firstNameKR: kr.firstName,
    lastNameKR: kr.lastName,
    nameTW: tw.name,
    firstNameTW: tw.firstName,
    lastNameTW: tw.lastName,
    nameTH: th.name,
    firstNameTH: th.firstName,
    lastNameTH: th.lastName,
  };
}

type SchaleDbLocales = {
  jp: Record<string, RawStudentData>;
  kr: Record<string, RawStudentData>;
  tw: Record<string, RawStudentData>;
  th: Record<string, RawStudentData>;
};

function namesFromSchaleDb(
  data: SeedStudentInput,
  locales: SchaleDbLocales,
): StudentNames {
  const jp = locales.jp[data.Id];
  const kr = locales.kr[data.Id];
  const tw = locales.tw[data.Id];
  const th = locales.th[data.Id];

  return {
    name: getStudentName(data),
    firstName: data.PersonalName,
    lastName: data.FamilyName,
    nameJP: getStudentNameJP(jp),
    firstNameJP: jp?.PersonalName ?? "",
    lastNameJP: jp?.FamilyName ?? "",
    nameKR: getStudentNameKR(kr),
    firstNameKR: kr?.PersonalName ?? "",
    lastNameKR: kr?.FamilyName ?? "",
    nameTW: getStudentNameTW(tw),
    firstNameTW: tw?.PersonalName ?? "",
    lastNameTW: tw?.FamilyName ?? "",
    nameTH: getStudentNameTH(th),
    firstNameTH: th?.PersonalName ?? "",
    lastNameTH: th?.FamilyName ?? "",
  };
}

function searchTagsFromSchaleDb(
  data: SeedStudentInput,
  locales: SchaleDbLocales,
): string[] {
  const tags = new Set<string>(data.SearchTags);

  for (const localized of [
    locales.jp[data.Id],
    locales.kr[data.Id],
    locales.tw[data.Id],
    locales.th[data.Id],
  ]) {
    if (!localized) {
      continue;
    }

    tags.add(localized.Name);

    for (const tag of localized.SearchTags) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

function searchTagsFromOverrides(data: SeedStudentInput): string[] {
  const tags = new Set<string>(data.SearchTags);

  for (const override of Object.values(data.__nameOverrides ?? {})) {
    if (override.name) {
      tags.add(override.name);
    }
  }

  return Array.from(tags);
}

async function seedStudents(provided?: SeedStudentInput[]) {
  const locales: SchaleDbLocales | null = provided
    ? null
    : {
        jp: await fetchStudentsDataJP(),
        kr: await fetchStudentsDataKR(),
        tw: await fetchStudentsDataTW(),
        th: await fetchStudentsDataTH(),
      };

  const isAlt = (student: SeedStudentInput) =>
    provided ? Boolean(student.baseVariantId) : student.Name.includes("(");

  const rawStudents: SeedStudentInput[] = [
    ...(provided ?? Object.values(await fetchStudentsData())),
  ].sort(sortAltsLast(isAlt));

  for await (const data of rawStudents) {
    const baseVariantId = provided
      ? (data.baseVariantId ?? null)
      : isAlt(data)
        ? findBaseVariantId(data, rawStudents, isAlt)
        : null;

    const names = locales
      ? namesFromSchaleDb(data, locales)
      : namesFromOverrides(data);

    const searchTags = locales
      ? searchTagsFromSchaleDb(data, locales)
      : searchTagsFromOverrides(data);

    const fields = {
      devName: data.DevName,
      schaleDbId: data.Id,
      defaultOrder: data.DefaultOrder,
      ...names,
      school: data.School,
      club: data.Club,
      age: data.CharacterAge,
      birthday: data.Birthday,
      introduction: data.ProfileIntroduction,
      hobbies: data.Hobby,
      voiceActor: data.CharacterVoice,
      illustrator: data.Illustrator,
      designer: data.Designer,
      height: data.CharHeightMetric,
      memorobiLevel: data.MemoryLobby.length > 0 ? data.MemoryLobby[0] : 0,
      attackType: data.BulletType,
      defenseType: data.ArmorType,
      combatClass: data.SquadType,
      combatRole: data.TacticRole,
      combatPosition: data.Position,
      streetBattleAdaptation: data.StreetBattleAdaptation,
      outdoorBattleAdaptation: data.OutdoorBattleAdaptation,
      indoorBattleAdaptation: data.IndoorBattleAdaptation,
      usesCover: data.Cover,
      weaponType: data.WeaponType,
      rarity: data.StarGrade,
      isReleasedJP: data.IsReleased[0],
      isReleasedGlobal: data.IsReleased[1],
      isReleasedCN: data.IsReleased[2],
      isLimitedJP:
        data.IsLimited[0] === StudentLimitedType.Limited ||
        data.IsLimited[0] === StudentLimitedType.Fest,
      isLimitedGlobal:
        data.IsLimited[1] === StudentLimitedType.Limited ||
        data.IsLimited[1] === StudentLimitedType.Fest,
      isLimitedCN:
        data.IsLimited[2] === StudentLimitedType.Limited ||
        data.IsLimited[2] === StudentLimitedType.Fest,
      isWelfareJP: data.IsLimited[0] === StudentLimitedType.Welfare,
      isWelfareGlobal: data.IsLimited[1] === StudentLimitedType.Welfare,
      isWelfareCN: data.IsLimited[2] === StudentLimitedType.Welfare,
      isFestJP: data.IsLimited[0] === StudentLimitedType.Fest,
      isFestGlobal: data.IsLimited[1] === StudentLimitedType.Fest,
      isFestCN: data.IsLimited[2] === StudentLimitedType.Fest,
      isArchiveJP: data.IsLimited[0] === StudentLimitedType.Archive,
      isArchiveGlobal: data.IsLimited[1] === StudentLimitedType.Archive,
      isArchiveCN: data.IsLimited[2] === StudentLimitedType.Archive,
      searchTags,
      equipment: data.Equipment,
      hasBondGearJP: data.Gear?.Released?.[0] ?? false,
      hasBondGearGlobal: data.Gear?.Released?.[1] ?? false,
      hasBondGearCN: data.Gear?.Released?.[2] ?? false,
      stability: data.StabilityPoint ?? 0,
      atkLevel1: data.AttackPower1 ?? 0,
      atkLevel100: data.AttackPower100 ?? 0,
      maxHPLevel1: data.MaxHP1 ?? 0,
      maxHPLevel100: data.MaxHP100 ?? 0,
      defLevel1: data.DefensePower1 ?? 0,
      defLevel100: data.DefensePower100 ?? 0,
      healLevel1: data.HealPower1 ?? 0,
      healLevel100: data.HealPower100 ?? 0,
      evasion: data.DodgePoint ?? 0,
      accuracy: data.AccuracyPoint ?? 0,
      crit: data.CriticalPoint ?? 0,
      critDamagePercent: data.CriticalDamageRate ?? 0,
      ammoCount: data.AmmoCount ?? 0,
      ammoCost: data.AmmoCost ?? 0,
      range: data.Range ?? 0,
      sightRange: data.SightPoint ?? 0,
      regenCost: data.RegenCost ?? 0,
    };

    const existing = await db.student.findUnique({
      where: {
        id: data.PathName,
      },
    });

    const student = existing
      ? await db.student.update({
          where: {
            id: data.PathName,
          },
          data:
            provided && baseVariantId ? { ...fields, baseVariantId } : fields,
        })
      : await db.student.create({
          data: {
            id: data.PathName,
            ...fields,
            baseVariantId,
          },
        });

    if (!provided) {
      if (!data.Skills) {
        throw new Error(`SchaleDB student ${data.PathName} has no skills`);
      }

      await db.skill.deleteMany({
        where: {
          studentId: student.id,
        },
      });

      await seedSkills(student.id, data.Skills);
    }

    logger.info(`Seeded student: ${student.name}`);
  }
}

export const seedStudentsTask: Task<
  "seed-students",
  SeedStudentsPayload | undefined,
  void
> = task({
  id: "seed-students",
  run: async (payload) => {
    const { students } = seedStudentsPayload.parse(payload ?? {});
    await seedStudents(students as SeedStudentInput[] | undefined);
    logger.info("All students seeded successfully.");
  },
});
