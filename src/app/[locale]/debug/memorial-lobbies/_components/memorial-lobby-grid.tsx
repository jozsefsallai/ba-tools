"use client";

import type { DebugLobbyStudent } from "@/app/[locale]/debug/memorial-lobbies/page";
import {
  MemorialLobbyViewer,
  ZONE_LEGEND,
} from "@/app/[locale]/students/[id]/_components/memorial-lobby-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  RotateCcwIcon,
  ScanIcon,
  SquareIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

// Every playing lobby is its own WebGL canvas, and browsers only keep around
// 16 contexts alive (older ones are lost), so pages stay at or below that.
const PAGE_SIZES = [4, 8, 12, 16];
const DEFAULT_PAGE_SIZE = 12;

type CellState = { playing: boolean; version: number };

export function MemorialLobbyGrid({
  students,
}: {
  students: DebugLobbyStudent[];
}) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0);
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [showZones, setShowZones] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? students.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.id.toLowerCase().includes(query),
        )
      : students;
  }, [students, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  const cellState = (id: string) => cells[id] ?? { playing: false, version: 0 };

  const update = (ids: string[], playing: boolean) =>
    setCells((previous) => {
      const next = { ...previous };

      for (const id of ids) {
        const current = previous[id] ?? { playing: false, version: 0 };
        next[id] = { playing, version: current.version + 1 };
      }

      return next;
    });

  const goToPage = (target: number) => {
    update(
      visible.map((s) => s.id),
      false,
    );

    setPage(Math.min(Math.max(target, 0), pageCount - 1));
  };

  const visibleIds = visible.map((s) => s.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card flex flex-wrap items-center gap-2 rounded-xl border p-3">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          placeholder="Search by name or id..."
          className="h-8 w-56"
        />

        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            update(visibleIds, false);
            setPageSize(Number(value));
            setPage(0);
          }}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeftIcon />
          </Button>

          <span className="text-muted-foreground min-w-24 text-center text-sm tabular-nums">
            Page {currentPage + 1} / {pageCount}
          </span>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}
          >
            <ChevronRightIcon />
          </Button>
        </div>

        <Button
          size="sm"
          variant={showZones ? "default" : "outline"}
          aria-pressed={showZones}
          onClick={() => setShowZones((show) => !show)}
        >
          <ScanIcon />
          Show touch areas
        </Button>

        {showZones && (
          <div className="flex items-center gap-3 text-xs">
            {ZONE_LEGEND.map(({ label, color }) => (
              <span key={label} className="inline-flex items-center gap-1">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" onClick={() => update(visibleIds, true)}>
            <PlayIcon />
            Play page
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => update(visibleIds, true)}
          >
            <RotateCcwIcon />
            Replay page
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => update(visibleIds, false)}
          >
            <SquareIcon />
            Stop page
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">No matching students.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((student) => {
            const state = cellState(student.id);

            return (
              <div
                key={student.id}
                className="bg-card flex flex-col gap-2 rounded-xl border p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/students/${student.id}`}
                    className="truncate text-sm font-semibold hover:underline"
                    title={student.id}
                  >
                    {student.name}

                    <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                      {student.id}
                    </span>
                  </Link>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => update([student.id], true)}
                    >
                      {state.playing ? <RotateCcwIcon /> : <PlayIcon />}
                      {state.playing ? "Replay" : "Play"}
                    </Button>

                    {state.playing && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => update([student.id], false)}
                      >
                        <SquareIcon />
                      </Button>
                    )}
                  </div>
                </div>

                <MemorialLobbyViewer
                  key={`${student.id}-${state.version}`}
                  lobbies={student.lobbies}
                  posterUrl={student.posterUrl}
                  autoPlay={state.playing}
                  showZones={showZones}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
