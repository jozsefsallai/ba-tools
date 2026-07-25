import { StudentExpCalculator } from "@/app/student-exp-calculator/_components/calculator";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Student EXP Calculator - Joe's Blue Archive Tools",
  description:
    "Calculate how many students you can level up with your Activity Reports.",
  twitter: {
    card: "summary",
  },
};

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
