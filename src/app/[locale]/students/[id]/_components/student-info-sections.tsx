import {
  DetailField,
  DetailSection,
} from "@/app/[locale]/students/[id]/_components/detail-section";
import { StudentGrowthStats } from "@/app/[locale]/students/[id]/_components/student-growth-stats";
import type {
  StudentDetail,
  StudentDetailGift,
} from "@/app/[locale]/students/[id]/_lib/student-detail.server";
import {
  GAME_SERVER_KEYS,
  TERRAINS,
  getLocalizedStudentNames,
} from "@/app/[locale]/students/_lib/student-display";
import giftAdoredImage from "@/assets/images/gift_adored.png";
import giftLikedImage from "@/assets/images/gift_liked.png";
import giftLovedImage from "@/assets/images/gift_loved.png";
import { EquipmentIcon } from "@/components/common/equipment-icon";
import { ItemCard } from "@/components/common/item-card";
import {
  TERRAIN_ICONS,
  TERRAIN_MOOD_ICONS,
  getTerrainGrade,
} from "@/lib/terrain";
import { cn } from "@/lib/utils";
import { BarChart3Icon, GiftIcon, IdCardIcon, SwordsIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

type SectionProps = { student: StudentDetail };

type Field = [label: string, value: string | null | undefined];

const FIELD_BOX_CLASS = "bg-background rounded-lg border px-3 py-2";

function FieldList({ fields }: { fields: Field[] }) {
  return fields
    .filter(([, value]) => value?.trim())
    .map(([label, value]) => (
      <DetailField key={label} label={label} className={FIELD_BOX_CLASS}>
        {value}
      </DetailField>
    ));
}

export async function StudentProfileSection({ student }: SectionProps) {
  const t = await getTranslations();
  const locale = await getLocale();
  const names = getLocalizedStudentNames(student, locale);

  const fullName = `${names.lastName} ${names.firstName}`.trim();
  const fullNameJP =
    locale === "ja"
      ? null
      : `${student.lastNameJP} ${student.firstNameJP}`.trim();

  const basicFields: Field[] = [
    [t("tools.students.detail.fields.age"), student.age],
    [t("tools.students.detail.fields.birthday"), student.birthday],
    [t("tools.students.detail.fields.height"), student.height],
  ];

  const creditFields: Field[] = [
    [t("tools.students.detail.fields.voiceActor"), student.voiceActor],
    [t("tools.students.detail.fields.illustrator"), student.illustrator],
    [t("tools.students.detail.fields.designer"), student.designer],
  ];

  return (
    <DetailSection
      title={t("tools.students.detail.sections.profile")}
      icon={IdCardIcon}
    >
      <div className="flex flex-col gap-2">
        {student.introduction && (
          <p
            className={cn(
              FIELD_BOX_CLASS,
              "text-sm leading-relaxed whitespace-pre-line",
            )}
          >
            {student.introduction}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {fullName && (
            <DetailField
              label={t("tools.students.detail.fields.fullName")}
              className={FIELD_BOX_CLASS}
            >
              {fullName}
              {fullNameJP && (
                <span className="text-muted-foreground block text-xs">
                  {fullNameJP}
                </span>
              )}
            </DetailField>
          )}

          <FieldList fields={basicFields} />

          {student.hobbies?.trim() && (
            <DetailField
              label={t("tools.students.detail.fields.hobbies")}
              className={cn(FIELD_BOX_CLASS, "col-span-full")}
            >
              {student.hobbies}
            </DetailField>
          )}
        </dl>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FieldList fields={creditFields} />
        </dl>
      </div>
    </DetailSection>
  );
}

const BOND_GEAR_FIELDS = {
  jp: "hasBondGearJP",
  global: "hasBondGearGlobal",
  cn: "hasBondGearCN",
} as const;

export async function StudentCombatSection({ student }: SectionProps) {
  const t = await getTranslations();

  return (
    <DetailSection
      title={t("tools.students.detail.sections.combat")}
      icon={SwordsIcon}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t("tools.students.detail.fields.terrain")}
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {TERRAINS.map((terrain) => {
              const grade = getTerrainGrade(student[terrain.field]);

              return (
                <div
                  key={terrain.key}
                  className="bg-background flex flex-col items-center gap-1 rounded-lg border p-2"
                >
                  <img
                    src={TERRAIN_ICONS[terrain.key].src}
                    alt=""
                    aria-hidden
                    className="size-8"
                  />

                  <span className="text-muted-foreground text-xs">
                    {t(`common.terrain.${terrain.key}`)}
                  </span>

                  <img
                    src={TERRAIN_MOOD_ICONS[grade].src}
                    alt={grade}
                    title={grade}
                    className="size-8"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <DetailField label={t("tools.students.detail.fields.usesCover")}>
            {student.usesCover ? t("common.yes") : t("common.no")}
          </DetailField>

          <DetailField label={t("tools.students.detail.fields.bondGear")}>
            <div className="flex flex-wrap gap-1">
              {GAME_SERVER_KEYS.map((server) => (
                <span
                  key={server}
                  className={cn("rounded border px-1.5 py-0.5 text-xs", {
                    "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300":
                      student[BOND_GEAR_FIELDS[server]],
                    "text-muted-foreground border-dashed line-through":
                      !student[BOND_GEAR_FIELDS[server]],
                  })}
                >
                  {t(`tools.students.servers.${server}`)}
                </span>
              ))}
            </div>
          </DetailField>
        </dl>

        {student.equipment.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("tools.students.detail.fields.equipment")}
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {student.equipment.map((equipment, idx) => (
                <div
                  key={`${equipment}-${idx}`}
                  // In the dark theme the tile is a neutral grey, lighter than
                  // the page, so dark navy items (hairpin, necklace) still show.
                  className="bg-background flex flex-col items-center gap-1 rounded-lg border p-2 dark:border-zinc-500 dark:bg-zinc-600"
                >
                  <EquipmentIcon
                    equipment={equipment}
                    className="h-12 w-auto object-contain"
                  />

                  <span className="max-w-full truncate text-sm font-medium">
                    {t(`common.equipment.${equipment}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DetailSection>
  );
}

export async function StudentStatsSection({ student }: SectionProps) {
  const t = await getTranslations();
  const numberFormat = new Intl.NumberFormat(await getLocale());

  const flatStats = [
    ["accuracy", student.accuracy],
    ["evasion", student.evasion],
    ["crit", student.crit],
    ["critDamage", `${student.critDamagePercent / 100}%`],
    ["stability", student.stability],
    ["range", student.range],
    ["ammoCount", student.ammoCount],
    ["ammoCost", student.ammoCost],
    ["regenCost", student.regenCost],
    ["sightRange", student.sightRange],
  ] as const;

  return (
    <DetailSection
      title={t("tools.students.detail.sections.stats")}
      icon={BarChart3Icon}
    >
      <div className="flex flex-col gap-4">
        <StudentGrowthStats
          rarity={student.rarity}
          stats={{
            maxHP: [student.maxHPLevel1, student.maxHPLevel100],
            atk: [student.atkLevel1, student.atkLevel100],
            def: [student.defLevel1, student.defLevel100],
            heal: [student.healLevel1, student.healLevel100],
          }}
        />

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {flatStats.map(([key, value]) => (
            <div
              key={key}
              className="bg-background flex flex-col gap-0.5 rounded-lg border px-3 py-2"
            >
              <dt className="text-muted-foreground truncate text-xs">
                {t(`tools.students.detail.stats.${key}`)}
              </dt>
              <dd className="font-semibold tabular-nums">
                {typeof value === "number" ? numberFormat.format(value) : value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </DetailSection>
  );
}

const GIFT_RARITY_ORDER = { SSR: 0, SR: 1, R: 2, N: 3 } as const;

const GIFT_PREFERENCES = [
  { key: "adored", icon: giftAdoredImage, field: "giftsAdored" },
  { key: "loved", icon: giftLovedImage, field: "giftsLoved" },
  { key: "liked", icon: giftLikedImage, field: "giftsLiked" },
] as const;

function sortGifts(gifts: StudentDetailGift[]) {
  return gifts
    .slice()
    .sort(
      (a, b) =>
        GIFT_RARITY_ORDER[a.rarity] - GIFT_RARITY_ORDER[b.rarity] ||
        a.id - b.id,
    );
}

export async function StudentGiftsSection({ student }: SectionProps) {
  const t = await getTranslations();
  const locale = await getLocale();

  const groups = GIFT_PREFERENCES.map((preference) => ({
    ...preference,
    gifts: sortGifts(student[preference.field]),
  })).filter((group) => group.gifts.length > 0);

  return (
    <DetailSection
      title={t("tools.students.detail.sections.gifts")}
      icon={GiftIcon}
    >
      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("tools.students.detail.gifts.none")}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                <img
                  src={group.icon.src}
                  alt=""
                  aria-hidden
                  className="size-5"
                />
                {t(`tools.students.detail.gifts.${group.key}`)}
              </h3>

              <div className="flex flex-wrap gap-3">
                {group.gifts.map((gift) => (
                  <ItemCard
                    key={gift.id}
                    name={
                      locale === "ja" ? gift.nameJP || gift.name : gift.name
                    }
                    description={
                      locale === "ja"
                        ? gift.descriptionJP || gift.description
                        : gift.description
                    }
                    iconName={gift.iconName}
                    rarity={gift.rarity}
                    displayName={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailSection>
  );
}
