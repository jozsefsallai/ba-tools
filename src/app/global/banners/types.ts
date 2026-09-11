import type {
  PublicBannerStudent,
  PublicGameBanner,
} from "@/lib/game-banners.server";

export type BannerGroups = Map<string, Array<PublicGameBanner>>;

export type BannerStudent = PublicBannerStudent;
