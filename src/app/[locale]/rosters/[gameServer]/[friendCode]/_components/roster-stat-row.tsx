"use client";

type RosterStatRowProps = {
  label: string;
  children: React.ReactNode;
};

export function RosterStatRow({ label, children }: RosterStatRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 md:gap-2">
      <div className="shrink-0 text-xs font-semibold">{label}</div>
      {children}
    </div>
  );
}
