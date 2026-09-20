"use client";

import { AdminBannerGroup } from "@/app/[locale]/admin/banners/_components/admin-banner-group";
import {
  NewBannerDialog,
  groupOptionsFromEntries,
} from "@/app/[locale]/admin/banners/_components/new-banner-dialog";
import { NewDateRangeDialog } from "@/app/[locale]/admin/banners/_components/new-date-range-dialog";
import { OffsetBannersDialog } from "@/app/[locale]/admin/banners/_components/offset-banners-dialog";
import { updateAdminBanner } from "@/app/[locale]/admin/banners/_lib/api";
import type { AdminBanner, EmptyBannerGroup } from "@/app/[locale]/admin/banners/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  bannerGroupKey,
  offsetBannerDate,
  parseBannerGroupKey,
} from "@/lib/admin/game-banner-dates";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CalendarClockIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export type AdminBannersViewProps = {
  initialBanners: AdminBanner[];
};

export function AdminBannersView({ initialBanners }: AdminBannersViewProps) {
  const t = useTranslations();
  const [banners, setBanners] = useState(initialBanners);
  const [emptyGroups, setEmptyGroups] = useState<EmptyBannerGroup[]>([]);
  const [activeBanner, setActiveBanner] = useState<AdminBanner | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { startDate: string; endDate: string; banners: AdminBanner[] }
    >();

    for (const banner of banners) {
      const key = bannerGroupKey(banner.startDate, banner.endDate);
      if (!map.has(key)) {
        map.set(key, {
          startDate: banner.startDate,
          endDate: banner.endDate,
          banners: [],
        });
      }
      map.get(key)?.banners.push(banner);
    }

    for (const empty of emptyGroups) {
      if (!map.has(empty.key)) {
        map.set(empty.key, {
          startDate: empty.startDate,
          endDate: empty.endDate,
          banners: [],
        });
      }
    }

    return Array.from(map.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
  }, [banners, emptyGroups]);

  const groupOptions = useMemo(
    () =>
      groupOptionsFromEntries([
        ...banners,
        ...emptyGroups.map((g) => ({
          startDate: g.startDate,
          endDate: g.endDate,
        })),
      ]),
    [banners, emptyGroups],
  );

  function handleBannerUpdated(updated: AdminBanner) {
    setBanners((prev) =>
      prev.map((banner) => (banner.id === updated.id ? updated : banner)),
    );
    setEmptyGroups((prev) =>
      prev.filter(
        (group) =>
          group.key !== bannerGroupKey(updated.startDate, updated.endDate),
      ),
    );
  }

  function handleBannerDeleted(id: string) {
    setBanners((prev) => prev.filter((banner) => banner.id !== id));
  }

  function handleBannerCreated(banner: AdminBanner) {
    setBanners((prev) => [...prev, banner]);
    setEmptyGroups((prev) =>
      prev.filter(
        (group) =>
          group.key !== bannerGroupKey(banner.startDate, banner.endDate),
      ),
    );
  }

  function handleAddDateRange(startDate: string, endDate: string) {
    const key = bannerGroupKey(startDate, endDate);
    const exists =
      groups.some((group) => group.key === key) ||
      emptyGroups.some((group) => group.key === key);

    if (exists) {
      toast.error(t("tools.admin.banners.toasts.groupExists"));
      return;
    }

    setEmptyGroups((prev) => [...prev, { key, startDate, endDate }]);
    toast.success(t("tools.admin.banners.toasts.groupCreateSuccess"));
  }

  function handleGroupDatesUpdated(
    oldKey: string,
    newStartDate: string,
    newEndDate: string,
  ) {
    const newKey = bannerGroupKey(newStartDate, newEndDate);

    setBanners((prev) =>
      prev.map((banner) => {
        if (bannerGroupKey(banner.startDate, banner.endDate) !== oldKey) {
          return banner;
        }
        return {
          ...banner,
          startDate: newStartDate,
          endDate: newEndDate,
        };
      }),
    );

    setEmptyGroups((prev) => {
      const wasEmpty = prev.some((group) => group.key === oldKey);
      const without = prev.filter(
        (group) => group.key !== oldKey && group.key !== newKey,
      );

      if (wasEmpty) {
        return [
          ...without,
          { key: newKey, startDate: newStartDate, endDate: newEndDate },
        ];
      }

      return without;
    });
  }

  function handleRemoveEmptyGroup(key: string) {
    setEmptyGroups((prev) => prev.filter((group) => group.key !== key));
  }

  function handleOffset(
    updatedBanners: AdminBanner[],
    offsetDays: number,
    fromStart: string,
  ) {
    const fromMs = new Date(fromStart).getTime();
    const updatedById = new Map(
      updatedBanners.map((banner) => [banner.id, banner]),
    );
    const now = Date.now();

    setBanners((prev) =>
      prev
        .map((banner) => updatedById.get(banner.id) ?? banner)
        .filter((banner) => new Date(banner.endDate).getTime() > now),
    );

    setEmptyGroups((prev) =>
      prev.map((group) => {
        if (new Date(group.startDate).getTime() < fromMs) {
          return group;
        }

        const startDate = offsetBannerDate(
          new Date(group.startDate),
          offsetDays,
        ).toISOString();
        const endDate = offsetBannerDate(
          new Date(group.endDate),
          offsetDays,
        ).toISOString();

        return {
          key: bannerGroupKey(startDate, endDate),
          startDate,
          endDate,
        };
      }),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const banner = banners.find((item) => item.id === event.active.id);
    setActiveBanner(banner ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveBanner(null);

    const { active, over } = event;
    if (!over) {
      return;
    }

    const banner = banners.find((item) => item.id === active.id);
    if (!banner) {
      return;
    }

    const overData = over.data.current as
      | {
          type?: string;
          startDate?: string;
          endDate?: string;
          banner?: AdminBanner;
        }
      | undefined;

    let targetStart = overData?.startDate;
    let targetEnd = overData?.endDate;

    if (overData?.type === "banner" && overData.banner) {
      targetStart = overData.banner.startDate;
      targetEnd = overData.banner.endDate;
    }

    if (!targetStart || !targetEnd) {
      const overBanner = banners.find((item) => item.id === over.id);
      if (overBanner) {
        targetStart = overBanner.startDate;
        targetEnd = overBanner.endDate;
      }
    }

    if (!targetStart || !targetEnd) {
      const group = groups.find((item) => item.key === over.id);
      if (group) {
        targetStart = group.startDate;
        targetEnd = group.endDate;
      } else {
        const [startMs, endMs] = parseBannerGroupKey(String(over.id));
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
          targetStart = new Date(startMs).toISOString();
          targetEnd = new Date(endMs).toISOString();
        }
      }
    }

    if (!targetStart || !targetEnd) {
      return;
    }

    const currentKey = bannerGroupKey(banner.startDate, banner.endDate);
    const targetKey = bannerGroupKey(targetStart, targetEnd);

    if (currentKey === targetKey) {
      return;
    }

    const previous = banner;
    const optimistic: AdminBanner = {
      ...banner,
      startDate: targetStart,
      endDate: targetEnd,
    };

    setBanners((prev) =>
      prev.map((item) => (item.id === banner.id ? optimistic : item)),
    );
    setEmptyGroups((prev) => prev.filter((group) => group.key !== targetKey));

    try {
      const updated = await updateAdminBanner(banner.id, {
        startDate: targetStart,
        endDate: targetEnd,
      });
      handleBannerUpdated(updated);
      toast.success(t("tools.admin.banners.toasts.moveSuccess"));
    } catch (err) {
      console.error(err);
      setBanners((prev) =>
        prev.map((item) => (item.id === previous.id ? previous : item)),
      );
      toast.error(
        err instanceof Error
          ? err.message
          : t("tools.admin.banners.toasts.moveFail"),
      );
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold">
              {t("tools.admin.banners.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("tools.admin.banners.description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <OffsetBannersDialog onOffset={handleOffset}>
              <Button type="button" variant="outline">
                <CalendarClockIcon className="size-4" />
                {t("tools.admin.banners.offset.action")}
              </Button>
            </OffsetBannersDialog>

            <NewDateRangeDialog onCreate={handleAddDateRange}>
              <Button type="button" variant="outline">
                <PlusIcon className="size-4" />
                {t("tools.admin.banners.addDateRange")}
              </Button>
            </NewDateRangeDialog>

            <NewBannerDialog
              groups={groupOptions}
              onCreated={handleBannerCreated}
            >
              <Button type="button" disabled={groupOptions.length === 0}>
                <PlusIcon className="size-4" />
                {t("tools.admin.banners.addBanner")}
              </Button>
            </NewBannerDialog>
          </div>
        </div>
      </div>

      <Separator />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {groups.map((group) => (
            <AdminBannerGroup
              key={group.key}
              groupKey={group.key}
              startDate={group.startDate}
              endDate={group.endDate}
              banners={group.banners}
              isEmptyLocal={emptyGroups.some((item) => item.key === group.key)}
              onBannerUpdated={handleBannerUpdated}
              onBannerDeleted={handleBannerDeleted}
              onGroupDatesUpdated={handleGroupDatesUpdated}
              onRemoveEmptyGroup={handleRemoveEmptyGroup}
            />
          ))}
        </section>

        {groups.length === 0 && (
          <div className="text-center text-muted-foreground py-16 border border-dashed rounded-md">
            {t("tools.admin.banners.empty")}
          </div>
        )}

        <DragOverlay>
          {activeBanner ? (
            <div className="border rounded-md p-3 bg-card shadow-xl opacity-90 max-w-xs">
              <div className="font-bold text-sm">
                {activeBanner.name ||
                  activeBanner.pickupStudents
                    .map((student) => student.name)
                    .join(", ")}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
