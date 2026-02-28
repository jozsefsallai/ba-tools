import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.myTimelines.title")} - ${t("common.appName")}`,
    description: t("tools.myTimelines.description"),
    twitter: {
      card: "summary",
    },
  };
}

export default async function MyTimelinesHomeLayout({
  children,
}: PropsWithChildren) {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">{t("tools.myTimelines.title")}</h1>

          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Link href="/user/timelines/new-group">
                {t("tools.myTimelines.newGroup")}
              </Link>
            </Button>

            <Button asChild>
              <Link href="/timeline-visualizer">
                {t("tools.myTimelines.newTimeline")}
              </Link>
            </Button>
          </div>
        </div>
        <p>{t("tools.myTimelines.description")}</p>
      </div>

      <Separator />

      {children}
    </div>
  );
}
