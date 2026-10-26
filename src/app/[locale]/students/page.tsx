import { StudentsDirectoryView } from "@/app/[locale]/students/_components/students-directory-view";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata() {
  return getCardMetadata("students", await getLocale());
}

export default async function StudentsPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">{t("tools.students.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("tools.students.description")}
        </p>
      </div>

      <Suspense>
        <StudentsDirectoryView />
      </Suspense>
    </div>
  );
}
