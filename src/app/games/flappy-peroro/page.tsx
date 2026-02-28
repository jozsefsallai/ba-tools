import FlappyPeroroGameContainer from "@/app/games/flappy-peroro/_components/game-container";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("static.flappyPeroro.title")} - ${t("common.appName")}`,
    description: t("static.flappyPeroro.description"),
    twitter: {
      card: "summary",
    },
  };
}

export default async function FlappyPeroroPage() {
  return <FlappyPeroroGameContainer />;
}
