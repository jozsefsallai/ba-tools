import { buildAlternativeSkillPortraitUrl } from "@/lib/url";

export type SkillCardVariantData = {
  id: string;
  name: string;
  image: string | null;
};

export const skillCardVariantMap = {
  ibuki: [
    {
      id: "default",
      name: "Default",
      image: null,
    },
    {
      id: "iroha_t_s_a",
      name: "Iroha T.S.A",
      image: buildAlternativeSkillPortraitUrl(
        "Skill_Portrait_Ibuki_Interaction",
      ),
    },
  ],

  toki: [
    {
      id: "default",
      name: "Default",
      image: null,
    },
    {
      id: "abi_eshuh",
      name: "Abi Eshuh",
      image: buildAlternativeSkillPortraitUrl("Skill_Portrait_CH0187Mod"),
    },
  ],

  hina_dress: [
    {
      id: "default",
      name: "Default",
      image: null,
    },
    {
      id: "shot_1",
      name: "Shot 1",
      image: buildAlternativeSkillPortraitUrl("Skill_Portrait_CH0230_01"),
    },
    {
      id: "shot_2",
      name: "Shot 2",
      image: buildAlternativeSkillPortraitUrl("Skill_Portrait_CH0230_02"),
    },
    {
      id: "shot_3",
      name: "Shot 3",
      image: buildAlternativeSkillPortraitUrl("Skill_Portrait_CH0230_03"),
    },
  ],

  noa_pajama: [
    {
      id: "default",
      name: "Default",
      image: null,
    },
    {
      id: "angry",
      name: "Angry",
      image: buildAlternativeSkillPortraitUrl("Skill_Portrait_CH0285_01"),
    },
  ],

  neru_uniform: [
    {
      id: "default",
      name: "Default",
      image: null,
    },
    {
      id: "angry",
      name: "Angry",
      image: buildAlternativeSkillPortraitUrl("Skill_Portrait_CH0280_01"),
    },
  ],

  mika_swimsuit: [
    {
      id: "default",
      name: "Default",
      image: null,
    },
    {
      id: "rapidfire",
      name: "Rapid Fire",
      image: buildAlternativeSkillPortraitUrl("Skill_Portrait_CH0294_01"),
    },
  ],
} as const satisfies Record<string, SkillCardVariantData[]>;

export type SkillCardVariant = keyof typeof skillCardVariantMap;
