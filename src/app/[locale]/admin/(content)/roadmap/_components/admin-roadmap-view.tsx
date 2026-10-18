"use client";

import {
  ItemFormDialog,
  type ItemFormState,
} from "@/app/[locale]/admin/(content)/roadmap/_components/item-form-dialog";
import {
  PushLaterDialog,
  type PushPrompt,
} from "@/app/[locale]/admin/(content)/roadmap/_components/push-later-dialog";
import { ShiftDialog } from "@/app/[locale]/admin/(content)/roadmap/_components/shift-dialog";
import {
  createRoadmapItem,
  deleteRoadmapItem,
  offsetRoadmapItems,
  revalidatePublicRoadmap,
  updateRoadmapItem,
} from "@/app/[locale]/admin/(content)/roadmap/_lib/api";
import {
  defaultInput,
  itemToInput,
} from "@/app/[locale]/admin/(content)/roadmap/_lib/inputs";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { RoadmapTimeZoneProvider } from "@/components/roadmap/roadmap-time-zone";
import {
  type RoadmapDragMode,
  type RoadmapItemChange,
  RoadmapTimeline,
} from "@/components/roadmap/roadmap-timeline";
import {
  RoadmapControls,
  useRoadmapControls,
  useRoadmapRangeStart,
} from "@/components/roadmap/roadmap-view";
import { useRoadmapLabels } from "@/components/roadmap/use-roadmap-labels";
import { Button } from "@/components/ui/button";
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import {
  EDITABLE_ROADMAP_KINDS,
  PERMANENT_END_DATE,
  ROADMAP_CATEGORIES,
  getItemSubtype,
  isEditableKind,
  isPermanent,
} from "@/lib/roadmap/constants";
import { addUTCDays, startOfUTCDay } from "@/lib/roadmap/layout";
import type { AnyRoadmapInput } from "@/lib/roadmap/schemas";
import type {
  EditableRoadmapItem,
  RoadmapCategory,
  RoadmapItem,
} from "@/lib/roadmap/types";
import {
  CalendarClockIcon,
  CopyIcon,
  GemIcon,
  InfinityIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

export type AdminRoadmapViewProps = {
  initialItems: RoadmapItem[];
  now: number;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function AdminRoadmapView({ initialItems, now }: AdminRoadmapViewProps) {
  const t = useTranslations();
  const labels = useRoadmapLabels();
  const [controls, updateControls] = useRoadmapControls(
    "admin-roadmap-view",
    false,
  );
  const rangeStart = useRoadmapRangeStart(now, controls.timeZone);

  const [items, setItems] = useState(initialItems);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [form, setForm] = useState<
    (ItemFormState & { item?: EditableRoadmapItem }) | null
  >(null);
  const [pushPrompt, setPushPrompt] = useState<PushPrompt | null>(null);
  const [shiftItem, setShiftItem] = useState<EditableRoadmapItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<EditableRoadmapItem | null>(
    null,
  );

  const categories = ROADMAP_CATEGORIES.filter(
    (category) => !controls.hidden.includes(category),
  );

  const replaceItems = (updated: RoadmapItem[]) => {
    const map = new Map(updated.map((item) => [item.id, item]));
    setItems((prev) => prev.map((item) => map.get(item.id) ?? item));
  };

  const promptPushLater = (original: EditableRoadmapItem, offsetMs: number) => {
    if (offsetMs === 0) {
      return;
    }

    const originalStart = new Date(original.startDate).getTime();
    const categoryItems = itemsRef.current
      .filter(
        (item): item is EditableRoadmapItem =>
          item.kind === original.kind &&
          item.id !== original.id &&
          new Date(item.startDate).getTime() > originalStart,
      )
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

    if (categoryItems.length === 0) {
      return;
    }

    const subtype = getItemSubtype(original);
    const subtypeItems = subtype
      ? categoryItems.filter((item) => getItemSubtype(item) === subtype)
      : [];

    setPushPrompt({
      item: original,
      offsetMs,
      categoryItems,
      subtype:
        subtypeItems.length > 0 && subtypeItems.length < categoryItems.length
          ? {
              label: labels.subtitle(original) ?? subtype ?? "",
              items: subtypeItems,
            }
          : null,
    });
  };

  const handlePushConfirm = async (targets: EditableRoadmapItem[]) => {
    if (!pushPrompt || targets.length === 0) {
      return;
    }

    try {
      const result = await offsetRoadmapItems(
        pushPrompt.item.kind,
        targets.map((item) => item.id),
        pushPrompt.offsetMs,
      );
      replaceItems(result.items);
      toast.success(
        t("tools.admin.roadmap.toasts.offsetSuccess", {
          count: result.updatedCount,
        }),
      );
    } catch (error) {
      toast.error(
        t("tools.admin.roadmap.toasts.offsetFail", {
          error: errorMessage(error),
        }),
      );
    }
  };

  const saveItem = async (
    item: EditableRoadmapItem,
    input: Partial<AnyRoadmapInput>,
    offsetMs: number,
  ): Promise<boolean> => {
    replaceItems([{ ...item, ...input } as RoadmapItem]);

    try {
      const saved = await updateRoadmapItem(item.kind, item.id, input);
      replaceItems([saved]);
      toast.success(t("tools.admin.roadmap.toasts.saveSuccess"));
    } catch (error) {
      replaceItems([item]);
      toast.error(
        t("tools.admin.roadmap.toasts.saveFail", {
          error: errorMessage(error),
        }),
      );
      return false;
    }

    promptPushLater(item, offsetMs);
    return true;
  };

  const handleTimelineChange = (
    item: EditableRoadmapItem,
    change: RoadmapItemChange,
    mode: RoadmapDragMode,
  ) => {
    const offsetMs =
      mode === "end"
        ? new Date(change.endDate).getTime() - new Date(item.endDate).getTime()
        : new Date(change.startDate).getTime() -
          new Date(item.startDate).getTime();

    void saveItem(item, change, offsetMs);
  };

  const handleShift = (item: EditableRoadmapItem, days: number) => {
    const startDate = addUTCDays(item.startDate, days).toISOString();
    const endDate = isPermanent(item.startDate, item.endDate)
      ? item.endDate
      : addUTCDays(item.endDate, days).toISOString();

    void saveItem(
      item,
      { startDate, endDate },
      new Date(startDate).getTime() - new Date(item.startDate).getTime(),
    );
  };

  const handleFormSubmit = async (input: AnyRoadmapInput) => {
    if (!form) {
      return false;
    }

    if (form.mode === "edit" && form.item) {
      const original = form.item;
      const startOffset =
        new Date(input.startDate).getTime() -
        new Date(original.startDate).getTime();
      const endOffset = isPermanent(input.startDate, input.endDate)
        ? 0
        : new Date(input.endDate).getTime() -
          new Date(original.endDate).getTime();

      return saveItem(original, input, startOffset || endOffset);
    }

    try {
      const created = await createRoadmapItem(form.kind, input);
      setItems((prev) => [...prev, created]);
      toast.success(t("tools.admin.roadmap.toasts.createSuccess"));
      return true;
    } catch (error) {
      toast.error(
        t("tools.admin.roadmap.toasts.createFail", {
          error: errorMessage(error),
        }),
      );
      return false;
    }
  };

  const handleRevalidate = async () => {
    try {
      await revalidatePublicRoadmap();
      toast.success(t("tools.admin.roadmap.toasts.revalidateSuccess"));
    } catch (error) {
      toast.error(
        t("tools.admin.roadmap.toasts.revalidateFail", {
          error: errorMessage(error),
        }),
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) {
      return;
    }

    try {
      await deleteRoadmapItem(deleteItem.kind, deleteItem.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      toast.success(t("tools.admin.roadmap.toasts.deleteSuccess"));
    } catch (error) {
      toast.error(
        t("tools.admin.roadmap.toasts.deleteFail", {
          error: errorMessage(error),
        }),
      );
    }
  };

  const openCreate = (kind: RoadmapCategory, date: Date) => {
    if (!isEditableKind(kind)) {
      return;
    }
    setForm({ mode: "create", kind, input: defaultInput(kind, date) });
  };

  const openEdit = (item: EditableRoadmapItem) => {
    setForm({
      mode: "edit",
      kind: item.kind,
      input: itemToInput(item),
      item,
      eventStudentName:
        item.kind === "event" ? (item.eventStudent?.name ?? null) : null,
    });
  };

  const openDuplicate = (item: EditableRoadmapItem) => {
    setForm({ mode: "create", kind: item.kind, input: itemToInput(item) });
  };

  const manageBannersItem = (
    <ContextMenuItem asChild>
      <Link href="/admin/banners">
        <GemIcon />
        {t("tools.admin.roadmap.manageBanners")}
      </Link>
    </ContextMenuItem>
  );

  const renderItemMenu = (item: RoadmapItem) => {
    if (item.kind === "banner") {
      return (
        <>
          <ContextMenuLabel className="text-xs text-muted-foreground font-normal">
            {t("tools.admin.roadmap.bannersReadOnly")}
          </ContextMenuLabel>
          {manageBannersItem}
        </>
      );
    }

    if (!isEditableKind(item.kind)) {
      return null;
    }

    const editable = item as EditableRoadmapItem;

    return (
      <>
        <ContextMenuLabel className="truncate">
          {labels.fullTitle(item)}
        </ContextMenuLabel>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={() => openEdit(editable)}>
          <PencilIcon />
          {t("tools.admin.roadmap.edit")}
        </ContextMenuItem>

        <ContextMenuItem onSelect={() => openDuplicate(editable)}>
          <CopyIcon />
          {t("tools.admin.roadmap.duplicate")}
        </ContextMenuItem>

        <ContextMenuItem onSelect={() => setShiftItem(editable)}>
          <CalendarClockIcon />
          {t("tools.admin.roadmap.shift")}
        </ContextMenuItem>

        {!isPermanent(item.startDate, item.endDate) && (
          <ContextMenuItem
            onSelect={() =>
              void saveItem(editable, { endDate: PERMANENT_END_DATE }, 0)
            }
          >
            <InfinityIcon />
            {t("tools.admin.roadmap.makePermanent")}
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          variant="destructive"
          onSelect={() => setDeleteItem(editable)}
        >
          <Trash2Icon />
          {t("tools.admin.roadmap.delete")}
        </ContextMenuItem>
      </>
    );
  };

  const renderEmptyMenu = (category: RoadmapCategory, date: Date) => {
    if (category === "banner") {
      return manageBannersItem;
    }

    if (!isEditableKind(category)) {
      return null;
    }

    return (
      <>
        <ContextMenuLabel className="text-xs text-muted-foreground font-normal">
          {labels.formatDate(date)}
        </ContextMenuLabel>

        <ContextMenuItem onSelect={() => openCreate(category, date)}>
          <PlusIcon />
          {t("tools.admin.roadmap.addCategoryHere", {
            category: labels.category(category),
          })}
        </ContextMenuItem>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">{t("tools.admin.roadmap.title")}</h1>

        <p className="text-muted-foreground text-sm">
          {t("tools.admin.roadmap.description")}
        </p>
      </div>

      <RoadmapTimeZoneProvider value={controls.timeZone}>
        <RoadmapControls
          state={controls}
          onChange={updateControls}
          allowText={false}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <PlusIcon />
                {t("tools.admin.roadmap.add")}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start">
              {EDITABLE_ROADMAP_KINDS.map((kind) => (
                <DropdownMenuItem
                  key={kind}
                  onSelect={() => openCreate(kind, startOfUTCDay(Date.now()))}
                >
                  {t("tools.admin.roadmap.addCategory", {
                    category: labels.category(kind),
                  })}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild variant="outline" size="sm">
            <Link href="/admin/banners">
              <GemIcon />
              {t("tools.admin.roadmap.manageBanners")}
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={handleRevalidate}>
            <RefreshCwIcon />
            {t("tools.admin.roadmap.revalidate")}
          </Button>
        </RoadmapControls>

        <RoadmapTimeline
          items={items}
          rangeStart={rangeStart}
          categories={categories}
          dayWidth={controls.dayWidth}
          showEmptyCategories
          editable
          onItemChange={handleTimelineChange}
          onItemOpen={openEdit}
          renderItemMenu={renderItemMenu}
          renderEmptyMenu={renderEmptyMenu}
        />
      </RoadmapTimeZoneProvider>

      <ItemFormDialog
        state={form}
        onOpenChange={(open) => !open && setForm(null)}
        onSubmit={handleFormSubmit}
      />

      <PushLaterDialog
        prompt={pushPrompt}
        onConfirm={handlePushConfirm}
        onClose={() => setPushPrompt(null)}
      />

      <ShiftDialog
        item={shiftItem}
        onShift={handleShift}
        onClose={() => setShiftItem(null)}
      />

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title={t("tools.admin.roadmap.deleteDialog.title")}
        description={t("tools.admin.roadmap.deleteDialog.description", {
          name: deleteItem ? labels.fullTitle(deleteItem) : "",
        })}
        confirmText={t("tools.admin.roadmap.deleteDialog.confirm")}
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
