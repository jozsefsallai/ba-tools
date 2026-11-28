export type SkillCardVariantData = {
  id: string;
  name: string;
  image: string | null;
};

export const DEFAULT_SKILL_CARD_VARIANT = "default";

const LEGACY_VARIANT_IDS: Record<string, Record<string, string>> = {
  ibuki: {
    iroha_t_s_a: "Skill_Portrait_Ibuki_Interaction",
  },
  toki: {
    abi_eshuh: "Skill_Portrait_CH0187Mod",
  },
  hina_dress: {
    shot_1: "Skill_Portrait_CH0230_01",
    shot_2: "Skill_Portrait_CH0230_02",
    shot_3: "Skill_Portrait_CH0230_03",
  },
  noa_pajama: {
    angry: "Skill_Portrait_CH0285_01",
  },
  neru_uniform: {
    angry: "Skill_Portrait_CH0280_01",
  },
  mika_swimsuit: {
    rapidfire: "Skill_Portrait_CH0294_01",
  },
  aris_battle: {
    stance_1: "Skill_Portrait_CH0334_01",
    stance_2: "Skill_Portrait_CH0334_02",
  },
  shun_swimsuit: {
    redraw: "Skill_Portrait_CH0355_01_01",
  },
};

export function findSkillCardVariant(
  variants: SkillCardVariantData[] | undefined,
  studentId: string,
  variantId: string | undefined,
): SkillCardVariantData | undefined {
  if (!variants || !variantId) {
    return undefined;
  }

  const id = LEGACY_VARIANT_IDS[studentId]?.[variantId] ?? variantId;
  return variants.find((v) => v.id === id);
}
