"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  SkillEffectText,
  SkillEffectView,
  StudentSkillView,
  StudentSkillsView,
} from "@/lib/data/student-skills.server";
import type { AttackType, SkillEffectCategory } from "@/lib/db/client";
import {
  type SkillMarkupNode,
  parseSkillMarkup,
} from "@/lib/skills/skill-markup";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { type ReactNode, useId, useMemo, useState } from "react";

const EX_MAX_LEVEL = 5;
const SKILL_MAX_LEVEL = 10;

const CATEGORY_ORDER: SkillEffectCategory[] = [
  "Buff",
  "Debuff",
  "CrowdControl",
  "Heal",
  "Special",
];

const CATEGORY_TEXT: Record<SkillEffectCategory, string> = {
  Buff: "text-[#fd4e30]",
  Debuff: "text-[#409eed]",
  CrowdControl: "text-[#b069f6]",
  Heal: "text-emerald-600 dark:text-emerald-400",
  // #ffc631 is too light to read on the light theme.
  Special: "text-[#b88600] dark:text-[#ffc631]",
  Glossary: "text-foreground",
};

const CATEGORY_CHIP: Record<SkillEffectCategory, string> = {
  Buff: "border-[#fd4e30]/40 bg-[#fd4e30]/10",
  Debuff: "border-[#409eed]/40 bg-[#409eed]/10",
  CrowdControl: "border-[#b069f6]/40 bg-[#b069f6]/10",
  Heal: "border-emerald-500/40 bg-emerald-500/10",
  Special: "border-[#ffc631]/50 bg-[#ffc631]/10",
  Glossary: "",
};

const ICON_BACKGROUNDS: Partial<Record<AttackType, string>> = {
  Explosion: "bg-type-red",
  Pierce: "bg-type-yellow",
  Mystic: "bg-type-blue",
  Sonic: "bg-type-purple",
  Chemical: "bg-type-green",
};

type Effects = StudentSkillsView["effects"];

type ResolvedEffect = {
  effect: SkillEffectView;
  text: SkillEffectText | null;
  suffix: string | null;
};

type EffectLookup = (id: string) => ResolvedEffect | undefined;

function effectLookup(effects: Effects, isFallback: boolean): EffectLookup {
  return (id) => {
    const effect = effects[id];
    if (!effect) {
      return undefined;
    }

    return {
      effect,
      text: isFallback ? (effect.text ?? effect.fallbackText) : effect.text,
      suffix: (isFallback ? effect.fallbackText : effect.text)?.suffix ?? null,
    };
  };
}

type Unlocks = { weapon: boolean; gear: boolean };

function visibleSkills(
  skills: StudentSkillView[],
  form: number,
  unlocks: Unlocks,
): StudentSkillView[] {
  const available = skills.filter(
    (s) =>
      s.formIndices.includes(form) &&
      s.requiredWeaponGrade <= (unlocks.weapon ? 2 : 0) &&
      s.requiredGearTier <= (unlocks.gear ? 2 : 0),
  );

  const replaced = new Set(available.map((s) => s.upgradeOfId));
  return available.filter((s) => !replaced.has(s.id));
}

function EffectIcon({
  effect,
  className,
}: {
  effect: SkillEffectView | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!effect?.iconUrl || failed) {
    return null;
  }

  return (
    <img
      src={effect.iconUrl}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("inline-block shrink-0 object-contain", className)}
    />
  );
}

function EffectLabel({
  resolved,
  children,
}: {
  resolved: ResolvedEffect | undefined;
  children: ReactNode;
}) {
  const effect = resolved?.effect;
  const text = resolved?.text;
  const className = cn(
    "font-semibold",
    effect ? CATEGORY_TEXT[effect.category] : "text-sky-600 dark:text-sky-400",
  );

  const icon = (
    <EffectIcon
      effect={effect}
      className="mr-0.5 mb-0.5 size-[1.15em] align-middle"
    />
  );

  if (!text?.description) {
    return (
      <span className={className}>
        {icon}
        {children}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            className,
            "cursor-help underline decoration-dotted underline-offset-2",
          )}
        >
          {icon}
          {children}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 text-sm">
        <p className="mb-1 flex items-center gap-1.5 font-semibold">
          <EffectIcon effect={effect} className="size-5" />
          {text.name}
        </p>

        <p className="text-muted-foreground whitespace-pre-line">
          {text.description}
        </p>
      </PopoverContent>
    </Popover>
  );
}

function SkillDescription({
  nodes,
  params,
  effectFor,
}: {
  nodes: SkillMarkupNode[];
  params: string[];
  effectFor: EffectLookup;
}) {
  return nodes.map((node, i) => {
    const key = `${node.kind}-${i}`;

    switch (node.kind) {
      case "text":
        return node.text;
      case "param":
        return (
          <span
            key={key}
            className="font-bold text-sky-600 tabular-nums dark:text-sky-400"
          >
            {params[node.index]}
          </span>
        );
      case "suffix": {
        const value = params[node.index] ?? "";
        const suffix = effectFor(node.id)?.suffix;
        return (
          <span key={key} className="text-muted-foreground">
            （
            <span className="font-bold text-sky-600 tabular-nums dark:text-sky-400">
              {suffix ? suffix.replace("[0]", value) : value}
            </span>
            ）
          </span>
        );
      }
      case "effect":
        return (
          <EffectLabel key={key} resolved={effectFor(node.id)}>
            <SkillDescription
              nodes={node.children}
              params={params}
              effectFor={effectFor}
            />
          </EffectLabel>
        );
      case "stat":
        return (
          <span key={key} className="font-semibold">
            <SkillDescription
              nodes={node.children}
              params={params}
              effectFor={effectFor}
            />
          </span>
        );
    }
  });
}

function EffectChips({
  skill,
  effectFor,
}: {
  skill: StudentSkillView;
  effectFor: EffectLookup;
}) {
  const t = useTranslations();

  const groups = CATEGORY_ORDER.map((category) => {
    const byName = new Map<string, ResolvedEffect>();

    for (const id of skill.effectIds) {
      const resolved = effectFor(id);
      const name = resolved?.text?.name;

      if (resolved?.effect.category === category && name) {
        if (!byName.has(name)) {
          byName.set(name, resolved);
        }
      }
    }

    return {
      category,
      effects: [...byName.values()],
    };
  }).filter((g) => g.effects.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {groups.map(({ category, effects }) => (
        <div key={category} className="flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground text-xs">
            {t(`tools.students.detail.skills.categories.${category}`)}
          </span>

          {effects.map(({ effect, text }) => (
            <span
              key={effect.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
                CATEGORY_CHIP[category],
                CATEGORY_TEXT[category],
              )}
            >
              <EffectIcon effect={effect} className="size-4" />
              {text?.name}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function SkillCard({
  skill,
  childSkills,
  level,
  effects,
  iconBackground,
  nested = false,
}: {
  skill: StudentSkillView;
  childSkills: (skill: StudentSkillView) => StudentSkillView[];
  level: (skill: StudentSkillView) => number;
  effects: Effects;
  iconBackground: string;
  nested?: boolean;
}) {
  const t = useTranslations();

  const index = Math.min(level(skill), skill.maxLevel) - 1;
  const template = skill.templates[skill.levelTemplates[index]];
  const nodes = useMemo(
    () => (template ? parseSkillMarkup(template) : []),
    [template],
  );
  const cost = skill.type === "EX" ? skill.costs[index] : undefined;
  const showCost = cost !== undefined;
  const children = childSkills(skill);
  const effectFor = effectLookup(effects, skill.isFallback);

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        nested
          ? "border-l-2 pl-3"
          : "bg-background rounded-lg border px-4 py-3",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "relative flex size-12 shrink-0 items-center justify-center rounded-lg p-1",
            iconBackground,
          )}
        >
          {skill.iconUrl && (
            <img
              src={skill.iconUrl}
              alt=""
              aria-hidden
              className="size-full object-contain"
              loading="lazy"
            />
          )}

          {showCost && (
            <span
              title={t("tools.students.detail.skills.cost", { cost })}
              className={cn(
                "ring-card absolute -right-2 -bottom-2 flex size-6 items-center justify-center rounded-full text-sm font-bold text-white tabular-nums ring-2",
                iconBackground,
              )}
            >
              <span aria-hidden>{cost}</span>
              <span className="sr-only">
                {t("tools.students.detail.skills.cost", { cost })}
              </span>
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {skill.useCondition ??
              (skill.source === "Additional"
                ? t("tools.students.detail.skills.additional")
                : t(`tools.students.detail.skills.types.${skill.type}`))}
          </span>

          <h3 className="font-semibold leading-tight">{skill.name}</h3>
        </div>
      </div>

      {nodes.length > 0 && (
        <p className="text-sm leading-relaxed whitespace-pre-line">
          <SkillDescription
            nodes={nodes}
            params={skill.params[index] ?? []}
            effectFor={effectFor}
          />
        </p>
      )}

      <EffectChips skill={skill} effectFor={effectFor} />

      {children.length > 0 && (
        <div className="flex flex-col gap-4">
          {children.map((child) => (
            <SkillCard
              key={child.id}
              skill={child}
              childSkills={childSkills}
              level={level}
              effects={effects}
              iconBackground={iconBackground}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LevelSlider({
  label,
  ariaLabel,
  value,
  max,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">
        {label}
      </span>

      <Slider
        min={1}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        aria-label={ariaLabel}
      />
    </div>
  );
}

function UnlockSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

export function StudentSkillsPanel({
  skills,
  effects,
  attackType,
}: StudentSkillsView & { attackType: AttackType }) {
  const t = useTranslations();

  const iconBackground = ICON_BACKGROUNDS[attackType] ?? "bg-slate-600";

  const forms = useMemo(
    () =>
      [...new Set(skills.flatMap((s) => s.formIndices))].sort((a, b) => a - b),
    [skills],
  );

  const hasWeaponSkills = skills.some((s) => s.requiredWeaponGrade > 0);
  const hasGearSkills = skills.some((s) => s.requiredGearTier > 0);

  const [form, setForm] = useState(forms[0] ?? 0);
  const [unlocks, setUnlocks] = useState<Unlocks>({
    weapon: true,
    gear: true,
  });
  const [exLevel, setExLevel] = useState(EX_MAX_LEVEL);
  const [skillLevel, setSkillLevel] = useState(SKILL_MAX_LEVEL);

  const shown = visibleSkills(skills, form, unlocks);
  const shownIds = new Set(shown.map((s) => s.id));
  const topLevel = shown.filter(
    (s) => !s.parentId || !shownIds.has(s.parentId),
  );

  const childSkills = (parent: StudentSkillView) =>
    shown.filter((s) => s.parentId === parent.id);

  const level = (skill: StudentSkillView) =>
    skill.type === "EX" ? exLevel : skillLevel;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LevelSlider
            label={t("tools.students.detail.skills.exLevel", {
              level: exLevel,
            })}
            ariaLabel={t("tools.students.detail.skills.exLevelLabel")}
            value={exLevel}
            max={EX_MAX_LEVEL}
            onChange={setExLevel}
          />

          <LevelSlider
            label={t("tools.students.detail.skills.skillLevel", {
              level: skillLevel,
            })}
            ariaLabel={t("tools.students.detail.skills.skillLevelLabel")}
            value={skillLevel}
            max={SKILL_MAX_LEVEL}
            onChange={setSkillLevel}
          />
        </div>

        {(forms.length > 1 || hasWeaponSkills || hasGearSkills) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {forms.length > 1 && (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={String(form)}
                onValueChange={(value) => value && setForm(Number(value))}
                aria-label={t("tools.students.detail.skills.stance")}
              >
                {forms.map((f) => (
                  <ToggleGroupItem key={f} value={String(f)}>
                    {t("tools.students.detail.skills.stanceOption", {
                      index: f + 1,
                    })}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}

            {hasWeaponSkills && (
              <UnlockSwitch
                label={t("tools.students.detail.skills.exclusiveWeapon")}
                checked={unlocks.weapon}
                onChange={(weapon) => setUnlocks((u) => ({ ...u, weapon }))}
              />
            )}

            {hasGearSkills && (
              <UnlockSwitch
                label={t("tools.students.detail.skills.bondGear")}
                checked={unlocks.gear}
                onChange={(gear) => setUnlocks((u) => ({ ...u, gear }))}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {topLevel.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            childSkills={childSkills}
            level={level}
            effects={effects}
            iconBackground={iconBackground}
          />
        ))}
      </div>

      {skills.some((s) => s.isFallback) && (
        <p className="text-muted-foreground text-xs">
          {t("tools.students.detail.skills.fallback")}
        </p>
      )}
    </div>
  );
}
