import planaIcon from "@/assets/plana-icon.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Image from "next/image";

type PlanaChatAvatarProps = {
  className?: string;
};

export function PlanaChatAvatar({ className }: PlanaChatAvatarProps) {
  return (
    <Avatar className={cn("size-8 border bg-background", className)}>
      <Image
        alt="Plana"
        className="size-full object-cover"
        placeholder="blur"
        src={planaIcon}
      />
      <AvatarFallback className="text-xs">P</AvatarFallback>
    </Avatar>
  );
}
