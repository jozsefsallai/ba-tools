"use client";

import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getBossOptions } from "@/lib/raid-info";
import { getRaidBossLabel } from "@/lib/raid-labels";
import { getRaidArt } from "@/lib/roadmap/raid-images";
import { cn } from "@/lib/utils";
import type { RaidType } from "~prisma";

function BossArt({ type, boss }: { type: RaidType; boss: string }) {
  const art = getRaidArt(type, boss);

  return art ? (
    <img
      src={art.image.src}
      alt=""
      draggable={false}
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-3/5 object-cover opacity-60 transition-opacity [mask-image:linear-gradient(to_right,transparent,black_70%)] group-hover:opacity-90"
    />
  ) : null;
}

function BossTile({
  type,
  boss,
  selected,
  onClick,
}: {
  type: RaidType;
  boss: string;
  selected: boolean;
  onClick: () => void;
}) {
  const t = useTranslations();

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "group relative flex h-16 cursor-pointer items-center gap-2 overflow-hidden rounded-md border bg-card px-3 text-left text-sm font-semibold transition-colors hover:border-primary/60",
        selected && "outline-2 -outline-offset-2 outline-primary",
      )}
    >
      <BossArt type={type} boss={boss} />

      <span className="relative min-w-0 wrap-break-word">
        {getRaidBossLabel(t, type, boss)}
      </span>

      {selected && (
        <span className="absolute top-0 right-0 flex h-6 w-10 items-center justify-center bg-primary pl-2 text-primary-foreground [clip-path:polygon(0_0,100%_0,100%_100%,35%_100%)]">
          <CheckIcon className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

const TILE_POPOVER_CLASS = "w-[28rem] max-w-[calc(100vw-2rem)] p-2";
const TILE_GRID_CLASS = "grid max-h-96 grid-cols-2 gap-1.5 overflow-y-auto";

export type RaidBossPickerProps = {
  type: RaidType;
  value: string | undefined;
  hinted?: boolean;
  badge?: ReactNode;
  onChange: (boss: string | undefined) => void;
};

export function RaidBossPicker({
  type,
  value,
  hinted,
  badge,
  onChange,
}: RaidBossPickerProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  function select(boss: string | undefined) {
    onChange(boss);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative flex h-16 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border bg-background px-3 text-left text-sm font-medium transition-colors hover:border-primary/60",
            hinted && "border-dashed border-primary/60",
          )}
        >
          {value && <BossArt type={type} boss={value} />}

          <span
            className={cn("relative min-w-0 truncate", {
              "text-muted-foreground": !value,
            })}
          >
            {getRaidBossLabel(t, type, value) ?? t("tools.raidDetails.notSet")}
          </span>

          <span className="relative">{badge}</span>

          <ChevronDownIcon className="relative ml-auto size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className={TILE_POPOVER_CLASS}>
        <div className={TILE_GRID_CLASS}>
          <button
            type="button"
            aria-pressed={!value}
            onClick={() => select(undefined)}
            className={cn(
              "col-span-2 flex h-9 cursor-pointer items-center justify-between rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent",
              !value && "border-primary text-foreground",
            )}
          >
            {t("tools.raidDetails.notSet")}
            {!value && <CheckIcon className="size-4" />}
          </button>

          {getBossOptions(type).map((boss) => (
            <BossTile
              key={boss}
              type={type}
              boss={boss}
              selected={value === boss}
              onClick={() => select(boss)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type RaidBossFilterProps = {
  label: string;
  options: {
    boss: string;
    type: RaidType;
  }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  modal?: boolean;
};

export function RaidBossFilter({
  label,
  options,
  selected,
  onChange,
  modal,
}: RaidBossFilterProps) {
  const t = useTranslations();

  const isActive = selected.length > 0;
  const single =
    selected.length === 1
      ? options.find((option) => option.boss === selected[0])
      : undefined;

  const summary = single
    ? getRaidBossLabel(t, single.type, single.boss)
    : isActive
      ? t("common.filters.selected", {
          count: selected.length,
        })
      : null;

  function toggle(boss: string) {
    onChange(
      selected.includes(boss)
        ? selected.filter((item) => item !== boss)
        : [
            ...selected,
            boss,
          ],
    );
  }

  return (
    <Popover modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between gap-1.5", {
            "border-primary/60 bg-primary/5 dark:bg-primary/10": isActive,
          })}
        >
          <span className="text-muted-foreground">{label}</span>

          {summary && (
            <span className="max-w-32 truncate font-semibold">{summary}</span>
          )}

          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className={TILE_POPOVER_CLASS}>
        <div className={TILE_GRID_CLASS}>
          {options.map(({ boss, type }) => (
            <BossTile
              key={boss}
              type={type}
              boss={boss}
              selected={selected.includes(boss)}
              onClick={() => toggle(boss)}
            />
          ))}
        </div>

        {isActive && (
          <div className="mt-2 border-t pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onChange([])}
            >
              <XIcon />
              {t("common.filters.clear")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
