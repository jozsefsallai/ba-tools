import yellowStar from "@/assets/images/yellow_star.png";
import blueStar from "@/assets/images/blue_star.png";
import { cn } from "@/lib/utils";
import type { StarLevel, UELevel } from "@/lib/types";

export type StudentStarProps = {
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  containerClassName?: string;
  imageClassName?: string;
  textClassName?: string;
};

export function StudentStar({
  starLevel,
  ueLevel,
  containerClassName,
  imageClassName,
  textClassName,
}: StudentStarProps) {
  if (!starLevel && !ueLevel) {
    return null;
  }

  const star = ueLevel ? blueStar : yellowStar;

  return (
    <div className={cn("flex relative", containerClassName)}>
      <img src={star.src} alt="star" className={imageClassName} />

      <div
        className={cn(
          "absolute top-0 left-0 w-full h-full flex items-center justify-center font-nexon-football-gothic font-bold text-[18px] leading-0 skew-x-[-11deg]",
          {
            "text-[#592c13]": !ueLevel,
            "text-[#273c60]": !!ueLevel,
          },
          textClassName,
        )}
      >
        {ueLevel ?? starLevel}
      </div>
    </div>
  );
}
