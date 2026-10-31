import { DetailSection } from "@/app/[locale]/students/[id]/_components/detail-section";
import { StudentSkillsPanel } from "@/app/[locale]/students/[id]/_components/student-skills-panel";
import { getStudentSkills } from "@/app/[locale]/students/[id]/_lib/student-skills.server";
import type { AttackType } from "@/lib/db/client";
import { ToolboxIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function StudentSkillsSection({
  studentId,
  attackType,
}: {
  studentId: string;
  attackType: AttackType;
}) {
  const t = await getTranslations();

  const { skills, effects } = await getStudentSkills(
    studentId,
    await getLocale(),
  );

  if (skills.length === 0) {
    return null;
  }

  return (
    <DetailSection
      title={t("tools.students.detail.sections.skills")}
      icon={ToolboxIcon}
    >
      <StudentSkillsPanel
        skills={skills}
        effects={effects}
        attackType={attackType}
      />
    </DetailSection>
  );
}
