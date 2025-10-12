import FlappyPeroroGameContainer from "@/app/games/flappy-peroro/_components/game-container";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flappy Peroro - Joe's Blue Archive Tools",
  description: "Flappy Bird game featuring Peroro from Momo Friends.",
  twitter: {
    card: "summary",
  },
};

export default async function FlappyPeroroPage() {
  return <FlappyPeroroGameContainer />;
}
