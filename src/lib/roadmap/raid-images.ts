import binahImage from "@/assets/images/raid/binah.png";
import chesedImage from "@/assets/images/raid/chesed.png";
import chokmahImage from "@/assets/images/raid/chokmah.png";
import drumbarkaImage from "@/assets/images/raid/drumbarka.png";
import geburahImage from "@/assets/images/raid/geburah.png";
import gozImage from "@/assets/images/raid/goz.png";
import gregoriusImage from "@/assets/images/raid/gregorius.png";
import hieronymusImage from "@/assets/images/raid/hieronymus.png";
import hodImage from "@/assets/images/raid/hod.png";
import hovercraftImage from "@/assets/images/raid/hovercraft.png";
import kaitenImage from "@/assets/images/raid/kaiten.png";
import kurokageImage from "@/assets/images/raid/kurokage.png";
import perorodzillaImage from "@/assets/images/raid/perorodzilla.png";
import shirokuroImage from "@/assets/images/raid/shirokuro.png";
import theFuryOfSetImage from "@/assets/images/raid/the_fury_of_set.png";
import timeAttackDefenseImage from "@/assets/images/raid/timeattack_defense.webp";
import timeAttackDestructionImage from "@/assets/images/raid/timeattack_destruction.webp";
import timeAttackEscortImage from "@/assets/images/raid/timeattack_escort.webp";
import timeAttackShootingImage from "@/assets/images/raid/timeattack_shooting.webp";
import tipharethImage from "@/assets/images/raid/tiphareth.png";
import yesodImage from "@/assets/images/raid/yesod.png";
import type { RoadmapRaidItem } from "@/lib/roadmap/types";
import type { StaticImageData } from "next/image";
import type {
  MultiFloorRaidBoss,
  RaidBoss,
  TimeAttackDungeonType,
} from "~prisma";

const RAID_BOSS_IMAGES: Record<RaidBoss, StaticImageData> = {
  Binah: binahImage,
  Chesed: chesedImage,
  ShiroKuro: shirokuroImage,
  Hieronymus: hieronymusImage,
  KAITEN: kaitenImage,
  Perorodzilla: perorodzillaImage,
  Hod: hodImage,
  Goz: gozImage,
  Gregorius: gregoriusImage,
  Hovercraft: hovercraftImage,
  Kurokage: kurokageImage,
  Geburah: geburahImage,
  Yesod: yesodImage,
  Drumbarka: drumbarkaImage,
};

const MULTI_FLOOR_RAID_BOSS_IMAGES: Record<
  MultiFloorRaidBoss,
  StaticImageData
> = {
  TheFuryOfSet: theFuryOfSetImage,
  Chokmah: chokmahImage,
  Tiphareth: tipharethImage,
};

const TIME_ATTACK_DUNGEON_IMAGES: Record<
  TimeAttackDungeonType,
  StaticImageData
> = {
  Defense: timeAttackDefenseImage,
  Shooting: timeAttackShootingImage,
  Destruction: timeAttackDestructionImage,
  Escort: timeAttackEscortImage,
};

export function getRaidImage(
  item: RoadmapRaidItem,
): { image: StaticImageData; shape: "wide" | "square" } | null {
  switch (item.type) {
    case "Raid":
    case "EliminateRaid":
      return item.raidBoss
        ? { image: RAID_BOSS_IMAGES[item.raidBoss], shape: "wide" }
        : null;
    case "MultiFloorRaid":
      return item.multiFloorRaidBoss
        ? {
            image: MULTI_FLOOR_RAID_BOSS_IMAGES[item.multiFloorRaidBoss],
            shape: "wide",
          }
        : null;
    case "TimeAttackDungeon":
      return item.timeAttackDungeonType
        ? {
            image: TIME_ATTACK_DUNGEON_IMAGES[item.timeAttackDungeonType],
            shape: "square",
          }
        : null;
    case "WorldRaid":
      return null;
  }
}
