import type { Student } from "@/lib/types";

import abydos from "@/assets/images/school/Abydos.png";
import arius from "@/assets/images/school/Arius.png";
import etc from "@/assets/images/school/ETC.png";
import gehenna from "@/assets/images/school/Gehenna.png";
import highlander from "@/assets/images/school/Highlander.png";
import hyakkiyako from "@/assets/images/school/Hyakkiyako.png";
import millennium from "@/assets/images/school/Millennium.png";
import odyssey from "@/assets/images/school/Odyssey.png";
import redWinter from "@/assets/images/school/RedWinter.png";
import srt from "@/assets/images/school/SRT.png";
import sakugawa from "@/assets/images/school/Sakugawa.png";
import shanhaijing from "@/assets/images/school/Shanhaijing.png";
import tokiwadai from "@/assets/images/school/Tokiwadai.png";
import trinity from "@/assets/images/school/Trinity.png";
import valkyrie from "@/assets/images/school/Valkyrie.png";
import wildHunt from "@/assets/images/school/WildHunt.png";
import { MaskIcon } from "@/components/common/mask-icon";

const SCHOOL_LOGOS = {
  Abydos: abydos,
  Arius: arius,
  ETC: etc,
  Gehenna: gehenna,
  Highlander: highlander,
  Hyakkiyako: hyakkiyako,
  Millennium: millennium,
  Odyssey: odyssey,
  RedWinter: redWinter,
  Sakugawa: sakugawa,
  Shanhaijing: shanhaijing,
  SRT: srt,
  Tokiwadai: tokiwadai,
  Trinity: trinity,
  Valkyrie: valkyrie,
  WildHunt: wildHunt,
} satisfies Record<Student["school"], { src: string }>;

export type SchoolLogoProps = {
  school: Student["school"];
  label?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export function SchoolLogo({ school, ...props }: SchoolLogoProps) {
  return <MaskIcon {...props} src={SCHOOL_LOGOS[school].src} />;
}
