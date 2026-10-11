import "server-only";

import bookOpenText from "@/assets/og-icons/book-open-text.svg?og-asset";
import cake from "@/assets/og-icons/cake.svg?og-asset";
import calculator from "@/assets/og-icons/calculator.svg?og-asset";
import clipboardMinus from "@/assets/og-icons/clipboard-minus.svg?og-asset";
import dices from "@/assets/og-icons/dices.svg?og-asset";
import gamepad from "@/assets/og-icons/gamepad.svg?og-asset";
import gem from "@/assets/og-icons/gem.svg?og-asset";
import grid2x2 from "@/assets/og-icons/grid-2x2.svg?og-asset";
import heart from "@/assets/og-icons/heart.svg?og-asset";
import idCard from "@/assets/og-icons/id-card.svg?og-asset";
import listOrdered from "@/assets/og-icons/list-ordered.svg?og-asset";
import messageCircleHeart from "@/assets/og-icons/message-circle-heart.svg?og-asset";
import rectangleEllipsis from "@/assets/og-icons/rectangle-ellipsis.svg?og-asset";
import shield from "@/assets/og-icons/shield.svg?og-asset";
import squareText from "@/assets/og-icons/square-text.svg?og-asset";
import swords from "@/assets/og-icons/swords.svg?og-asset";
import trainTrack from "@/assets/og-icons/train-track.svg?og-asset";
import users from "@/assets/og-icons/users.svg?og-asset";

import type { OgIconName, OgVariant } from "@/lib/og/registry";

export const VARIANT_ICONS: Partial<Record<OgVariant, OgIconName>> = {
  formation: "users",
  timeline: "list-ordered",
  bond: "heart",
  probability: "dices",
  progress: "calculator",
  railway: "train-track",
  chat: "message-circle-heart",
  birthday: "cake",
  banner: "gem",
  game: "gamepad",
  scene: "book-open-text",
  inventory: "grid-2x2",
};

const icons: Record<OgIconName, string> = {
  heart: heart,
  "list-ordered": listOrdered,
  "grid-2x2": grid2x2,
  "train-track": trainTrack,
  calculator: calculator,
  "clipboard-minus": clipboardMinus,
  swords: swords,
  users: users,
  "id-card": idCard,
  "square-text": squareText,
  "rectangle-ellipsis": rectangleEllipsis,
  dices: dices,
  "book-open-text": bookOpenText,
  "message-circle-heart": messageCircleHeart,
  gem: gem,
  cake: cake,
  gamepad: gamepad,
  shield: shield,
};

export function lucideOgIcon(name: OgIconName) {
  return icons[name];
}
