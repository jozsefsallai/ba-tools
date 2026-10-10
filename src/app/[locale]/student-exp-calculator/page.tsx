import { StudentExpCalculator } from "@/app/[locale]/student-exp-calculator/_components/calculator";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("student-exp-calculator", await getLocale());
}

export default async function StudentExpCalculatorPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("tools.studentExp.title")}</h1>
        </div>
        <p>{t("tools.studentExp.description")}</p>
      </div>

      <StudentExpCalculator />
    </div>
  );
}
