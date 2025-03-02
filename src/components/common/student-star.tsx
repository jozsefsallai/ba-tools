import yellowStar from "@/assets/images/yellow_star.png";
import blueStar from "@/assets/images/blue_star.png";
import { cn } from "@/lib/utils";
import type { StarLevel, UELevel } from "@/lib/types";

export type StudentStarProps = {
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  containerClassName?: string;
  imageClassName?: string;
};

export function StudentStar({
  starLevel,
  ueLevel,
  containerClassName,
  imageClassName,
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
          "flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold skew-x-[-11deg] ml-[1px] mt-[1px]",
          {
            "text-[#592c13]": !ueLevel,
            "text-[#273c60]": !!ueLevel,
          },
        )}
      >
        {ueLevel ?? starLevel}
      </div>
    </div>
  );
}
