import { MemorialLobbySection } from "@/app/[locale]/students/[id]/_components/memorial-lobby-section";
import { StudentBreadcrumbs } from "@/app/[locale]/students/[id]/_components/student-breadcrumbs";
import {
  StudentHeader,
  StudentSpritePanel,
} from "@/app/[locale]/students/[id]/_components/student-hero";
import {
  StudentCombatSection,
  StudentGiftsSection,
  StudentProfileSection,
  StudentStatsSection,
} from "@/app/[locale]/students/[id]/_components/student-info-sections";
import { StudentVariantsSection } from "@/app/[locale]/students/[id]/_components/student-variants-section";
import {
  getStudentDetail,
  resolveStudent,
} from "@/app/[locale]/students/[id]/_lib/student-detail.server";
import { getLocalizedStudentNames } from "@/app/[locale]/students/_lib/student-display";
import { permanentRedirect } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { ogLocale, sharingMetadata } from "@/lib/og-metadata.server";
import { OG_DESIGN_VERSION } from "@/lib/og/registry";
import { truncateText } from "@/lib/text-utils";
import { buildStudentIconUrl, buildStudentPortraitUrl } from "@/lib/url";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export const revalidate = 86_400;

type PageParams = {
  id: string;
};

export async function generateStaticParams(): Promise<PageParams[]> {
  const students = await db.student.findMany({ select: { id: true } });
  return students.map((student) => ({ id: student.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { id } = await params;

  const resolved = await resolveStudent(id);

  const student = resolved ? await getStudentDetail(resolved.id) : null;
  if (!student) {
    return {};
  }

  const locale = await getLocale();
  const t = await getTranslations();

  const { name } = getLocalizedStudentNames(student, locale);

  return sharingMetadata({
    title: t("common.sharing.title", {
      title: name,
      appName: t("common.appName"),
    }),
    description: truncateText(
      (student.introduction ?? "").replace(/\s+/g, " ").trim() ||
        t("tools.students.description"),
      160,
    ),
    image: `/api/og/${ogLocale(locale)}/students?v=${OG_DESIGN_VERSION}`,
    locale,
    alt: name,
  });
}

export default async function StudentPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;
  const locale = await getLocale();

  const resolved = await resolveStudent(id);
  if (!resolved) {
    notFound();
  }

  if (!resolved.canonical) {
    permanentRedirect({ href: `/students/${resolved.id}`, locale });
  }

  const student = await getStudentDetail(resolved.id);
  if (!student) {
    notFound();
  }

  const { name } = getLocalizedStudentNames(student, locale);

  return (
    <StudentBreadcrumbs name={name} iconUrl={buildStudentIconUrl(student)}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <StudentSpritePanel student={student} />
        </aside>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <StudentHeader student={student} />
          <StudentProfileSection student={student} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <StudentCombatSection student={student} />
            <StudentGiftsSection student={student} />
          </div>

          <StudentStatsSection student={student} />

          <MemorialLobbySection
            studentId={student.id}
            posterUrl={buildStudentPortraitUrl(student)}
            memorobiLevel={student.memorobiLevel}
          />

          <StudentVariantsSection student={student} />
        </div>
      </div>
    </StudentBreadcrumbs>
  );
}
