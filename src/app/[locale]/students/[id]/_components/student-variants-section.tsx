import { DetailSection } from "@/app/[locale]/students/[id]/_components/detail-section";
import type { StudentDetail } from "@/app/[locale]/students/[id]/_lib/student-detail.server";
import { StudentGridCard } from "@/app/[locale]/students/_components/student-grid-card";
import { Layers2Icon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function StudentVariantsSection({
  student,
}: {
  student: StudentDetail;
}) {
  const t = await getTranslations();
  const locale = await getLocale();

  const base = student.baseVariant;
  const relatives = base
    ? [base, ...base.variants.filter((v) => v.id !== student.id)]
    : student.variants;

  if (relatives.length === 0) {
    return null;
  }

  return (
    <DetailSection
      title={t("tools.students.detail.sections.variants")}
      icon={Layers2Icon}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
        {relatives.map((variant) => (
          <StudentGridCard
            key={variant.id}
            student={{
              ...variant,
              name:
                locale === "ja" ? variant.nameJP || variant.name : variant.name,
            }}
            subtitle={
              base && variant.id === base.id
                ? t("tools.students.detail.variants.original")
                : undefined
            }
          />
        ))}
      </div>
    </DetailSection>
  );
}
