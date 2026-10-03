import { cn } from "@/lib/utils";

type EmptyCardProps = {
  label?: string;
  className?: string;
};

export function EmptyCard({ label = "EMPTY", className }: EmptyCardProps) {
  return (
    <div
      className={cn(
        "skew-x-[-11deg] p-[2px] rounded-[11%] h-[88px] w-[93px] flex items-center justify-center bg-black/65 text-white border-2 border-white opacity-45",
        className,
      )}
    >
      <div className="font-nexon-football-gothic font-bold text-[20px] uppercase">
        {label}
      </div>
    </div>
  );
}
