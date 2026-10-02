import type { SkillType } from "../lib/db/client";
import { db } from "../lib/db";
import {
  fetchStudentsData,
  fetchStudentsDataJP,
  StudentLimitedType,
  type RawEffect,
  type RawStudentData,
  type RawStudentSkillsData,
} from "./lib/common";
import { logger, task, type Task } from "@trigger.dev/sdk";

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

function sortAltsLast(a: RawStudentData, b: RawStudentData) {
  const aIsAlt = a.Name.includes("(");
  const bIsAlt = b.Name.includes("(");

  if (aIsAlt && !bIsAlt) {
    return 1;
  }

  if (!aIsAlt && bIsAlt) {
    return -1;
  }

  return 0;
}

function getStudentName(student: RawStudentData): string {
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

function getStudentNameJP(student?: RawStudentData): string {
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

async function seedStudents() {
  const studentsData = await fetchStudentsData();
  const studentsDataJP = await fetchStudentsDataJP();

  const rawStudents = Object.values(studentsData).sort(sortAltsLast);

  for await (const data of rawStudents) {
    const baseVariantId = data.Name.includes("(")
      ? rawStudents.find(
          (s) =>
            data.PathName.startsWith(s.PathName) &&
            s.PathName !== data.PathName,
        )?.PathName
      : null;

    let student = await db.student.findUnique({
      where: {
        id: data.PathName,
      },
    });

    const jpStudent = studentsDataJP[data.Id];
    const nameJP = getStudentNameJP(jpStudent);

    const studentName = getStudentName(data);

    const searchTagsSet = new Set<string>(data.SearchTags);

    if (jpStudent && jpStudent.SearchTags.length > 0) {
      for (const tag of jpStudent.SearchTags) {
        searchTagsSet.add(tag);
      }
    }

    if (!student) {
      student = await db.student.create({
        data: {
          id: data.PathName,
          devName: data.DevName,
          schaleDbId: data.Id,
          defaultOrder: data.DefaultOrder,
          name: studentName,
          firstName: data.PersonalName,
          lastName: data.FamilyName,
          nameJP,
          firstNameJP: jpStudent?.PersonalName ?? "",
          lastNameJP: jpStudent?.FamilyName ?? "",
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
          searchTags: Array.from(searchTagsSet),
          equipment: data.Equipment,
          hasBondGearJP: data.Gear?.Released?.[0] ?? false,
          hasBondGearGlobal: data.Gear?.Released?.[1] ?? false,
          hasBondGearCN: data.Gear?.Released?.[2] ?? false,
          baseVariantId,
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
        },
      });
    } else {
      student = await db.student.update({
        where: {
          id: data.PathName,
        },
        data: {
          devName: data.DevName,
          schaleDbId: data.Id,
          defaultOrder: data.DefaultOrder,
          name: studentName,
          firstName: data.PersonalName,
          lastName: data.FamilyName,
          nameJP,
          firstNameJP: jpStudent?.PersonalName ?? "",
          lastNameJP: jpStudent?.FamilyName ?? "",
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
          equipment: data.Equipment,
          hasBondGearJP: data.Gear?.Released?.[0] ?? false,
          hasBondGearGlobal: data.Gear?.Released?.[1] ?? false,
          hasBondGearCN: data.Gear?.Released?.[2] ?? false,
          searchTags: Array.from(searchTagsSet),
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
        },
      });
    }

    await db.skill.deleteMany({
      where: {
        studentId: student.id,
      },
    });

    await seedSkills(student.id, data.Skills);

    logger.info(`Seeded student: ${student.name}`);
  }
}

export const seedStudentsTask: Task<"seed-students", void, void> = task({
  id: "seed-students",
  run: async () => {
    await seedStudents();
    logger.info("All students seeded successfully.");
  },
});
