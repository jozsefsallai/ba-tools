import fs from "node:fs";
import path from "node:path";
import type { OgIconName } from "@/lib/og/registry";
import {
  BookOpenText,
  Cake,
  Calculator,
  ClipboardMinus,
  Dices,
  Gamepad,
  Gem,
  Grid2X2,
  Heart,
  IdCard,
  ListOrdered,
  type LucideIcon,
  MessageCircleHeart,
  RectangleEllipsis,
  Shield,
  SquareText,
  Swords,
  TrainTrack,
  Users,
} from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ICONS: Record<OgIconName, LucideIcon> = {
  heart: Heart,
  "list-ordered": ListOrdered,
  "grid-2x2": Grid2X2,
  "train-track": TrainTrack,
  calculator: Calculator,
  "clipboard-minus": ClipboardMinus,
  swords: Swords,
  users: Users,
  "id-card": IdCard,
  "square-text": SquareText,
  "rectangle-ellipsis": RectangleEllipsis,
  dices: Dices,
  "book-open-text": BookOpenText,
  "message-circle-heart": MessageCircleHeart,
  gem: Gem,
  cake: Cake,
  gamepad: Gamepad,
  shield: Shield,
};

// Generate Lucide icons for Satori without loading React components at request
// time
const directory = path.join(process.cwd(), "src/assets/og-icons");

fs.mkdirSync(directory, { recursive: true });

for (const [name, Icon] of Object.entries(ICONS)) {
  const svg = renderToStaticMarkup(
    createElement(Icon, {
      size: 280,
      strokeWidth: 1.25,
      color: "#8F4FAE",
      "aria-hidden": true,
    }),
  );

  fs.writeFileSync(path.join(directory, `${name}.svg`), svg);
}

console.log(`Generated ${Object.keys(ICONS).length} Lucide icons.`);
