import { getLocale } from "next-intl/server";
import FlappyPeroroGameContainer from "@/app/[locale]/games/flappy-peroro/_components/game-container";
import { getCardMetadata } from "@/lib/og-metadata.server";

export async function generateMetadata() {
  return getCardMetadata("games-flappy-peroro", await getLocale());
}

export default async function FlappyPeroroPage() {
  return <FlappyPeroroGameContainer />;
}
