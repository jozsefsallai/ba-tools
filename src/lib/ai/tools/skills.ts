import type { StudentSkillsView } from "@/lib/data/student-skills.server";

function renderTemplate(
  template: string,
  params: string[],
  effects: StudentSkillsView["effects"],
) {
  return template
    .replace(/\{p:(\d+)\}/g, (_, index) => params[Number(index)] ?? "")
    .replace(/\{d:([^:}]+):(\d+)\}/g, (_, effectId, index) => {
      const value = params[Number(index)] ?? "";
      const suffix = effects[effectId]?.text?.suffix;

      return suffix ? ` (${suffix.replace("[0]", value)})` : ` (${value})`;
    })
    .replace(/\{e:[^}]+\}|\{\/e\}|\{s:[^}]+\}|\{\/s\}/g, "")
    .replaceAll("{{", "{");
}

/** Each skill at its highest level, as plain text, instead of every level's data. */
export function summarizeSkills({ skills, effects }: StudentSkillsView) {
  return skills.map((skill) => {
    const level = skill.maxLevel;
    const templateIndex = skill.levelTemplates[level - 1] ?? 0;

    return {
      name: skill.name,
      type: skill.type,
      source: skill.source,
      maxLevel: level,
      cost: skill.costs[level - 1],
      description: renderTemplate(
        skill.templates[templateIndex] ?? "",
        skill.params[level - 1] ?? [],
        effects,
      ),
      requiredWeaponGrade: skill.requiredWeaponGrade || undefined,
      requiredGearTier: skill.requiredGearTier || undefined,
    };
  });
}
