import "server-only";

import abydos from "@/assets/images/school/Abydos.png?og-asset";
import arius from "@/assets/images/school/Arius.png?og-asset";
import etc from "@/assets/images/school/ETC.png?og-asset";
import gehenna from "@/assets/images/school/Gehenna.png?og-asset";
import highlander from "@/assets/images/school/Highlander.png?og-asset";
import hyakkiyako from "@/assets/images/school/Hyakkiyako.png?og-asset";
import millennium from "@/assets/images/school/Millennium.png?og-asset";
import odyssey from "@/assets/images/school/Odyssey.png?og-asset";
import redWinter from "@/assets/images/school/RedWinter.png?og-asset";
import srt from "@/assets/images/school/SRT.png?og-asset";
import sakugawa from "@/assets/images/school/Sakugawa.png?og-asset";
import shanhaijing from "@/assets/images/school/Shanhaijing.png?og-asset";
import tokiwadai from "@/assets/images/school/Tokiwadai.png?og-asset";
import trinity from "@/assets/images/school/Trinity.png?og-asset";
import valkyrie from "@/assets/images/school/Valkyrie.png?og-asset";
import wildHunt from "@/assets/images/school/WildHunt.png?og-asset";
import type { School } from "~prisma";

export const OG_SCHOOL_LOGOS: Record<School, string> = {
  Abydos: abydos,
  Arius: arius,
  ETC: etc,
  Gehenna: gehenna,
  Highlander: highlander,
  Hyakkiyako: hyakkiyako,
  Millennium: millennium,
  Odyssey: odyssey,
  RedWinter: redWinter,
  SRT: srt,
  Sakugawa: sakugawa,
  Shanhaijing: shanhaijing,
  Tokiwadai: tokiwadai,
  Trinity: trinity,
  Valkyrie: valkyrie,
  WildHunt: wildHunt,
};
