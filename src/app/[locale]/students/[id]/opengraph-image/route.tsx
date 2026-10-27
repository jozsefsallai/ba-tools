import { StudentOgImage } from "@/app/[locale]/students/[id]/_components/student-og-image";
import {
  getStudentDetail,
  resolveStudent,
} from "@/app/[locale]/students/[id]/_lib/student-detail.server";
import { getLocalizedStudentNames } from "@/app/[locale]/students/_lib/student-display";
import { getMessagesForLocale } from "@/i18n/messages";
import { getOgAssetUrls } from "@/lib/og-assets.server";
import { makeOgImage } from "@/lib/og-image.server";
import { ogLocale } from "@/lib/og-metadata.server";
import { fetchOgArtwork } from "@/lib/og/artwork.server";
import { OG_SCHOOL_LOGOS } from "@/lib/og/school-logos.server";
import { buildStudentPortraitUrl } from "@/lib/url";
import { createTranslator } from "next-intl";
import { notFound } from "next/navigation";
import type { AttackType, DefenseType } from "~prisma";

export const runtime = "nodejs";
export const revalidate = 86_400;

const TYPE_COLORS = {
  red: "#930008",
  yellow: "#bf8901",
  blue: "#226f9c",
  purple: "#794394",
  green: "#11736b",
};

const ATTACK_TYPE_COLORS: Partial<Record<AttackType, string>> = {
  Explosion: TYPE_COLORS.red,
  Pierce: TYPE_COLORS.yellow,
  Mystic: TYPE_COLORS.blue,
  Sonic: TYPE_COLORS.purple,
  Chemical: TYPE_COLORS.green,
};

const DEFENSE_TYPE_COLORS: Partial<Record<DefenseType, string>> = {
  LightArmor: TYPE_COLORS.red,
  HeavyArmor: TYPE_COLORS.yellow,
  Unarmed: TYPE_COLORS.blue,
  ElasticArmor: TYPE_COLORS.purple,
  CompositeArmor: TYPE_COLORS.green,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale: rawLocale, id } = await params;
  const locale = ogLocale(rawLocale);

  const resolved = await resolveStudent(id);

  const student = resolved ? await getStudentDetail(resolved.id) : null;
  if (!student) {
    notFound();
  }

  const t = createTranslator({
    locale,
    messages: await getMessagesForLocale(locale),
  });

  const { name } = getLocalizedStudentNames(student, locale);
  const subtitle = `${student.lastNameJP} ${student.firstNameJP}`.trim();

  const assets = getOgAssetUrls();
  const portrait = await fetchOgArtwork(buildStudentPortraitUrl(student));

  const png = await makeOgImage(
    <StudentOgImage
      name={name}
      subtitle={subtitle && subtitle !== name ? subtitle : undefined}
      studentNumber={String(student.schaleDbId)}
      barcodeSeed={student.id}
      rarity={student.rarity}
      portraitUrl={portrait}
      schoolLogoUrl={OG_SCHOOL_LOGOS[student.school]}
      starUrl={assets.yellowStar}
      fields={[
        {
          label: t("tools.students.detail.fields.school"),
          value: t(`common.school.${student.school}`),
          icon: OG_SCHOOL_LOGOS[student.school],
        },
        {
          label: t("tools.students.detail.fields.club"),
          value: t(`common.club.${student.club}`),
        },
        {
          label: t("tools.students.filters.attackType"),
          value: t(`common.attackType.${student.attackType}`),
          dot: ATTACK_TYPE_COLORS[student.attackType],
        },
        {
          label: t("tools.students.filters.defenseType"),
          value: t(`common.defenseType.${student.defenseType}`),
          dot: DEFENSE_TYPE_COLORS[student.defenseType],
        },
        {
          label: t("tools.students.detail.fields.age"),
          value: student.age || "—",
        },
        {
          label: t("tools.students.detail.fields.birthday"),
          value: student.birthday || "—",
        },
      ]}
    />,
  );

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
