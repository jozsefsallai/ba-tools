"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "convex/react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AccountDialog } from "@/app/[locale]/recruitment-tracker/_components/account-dialog";
import {
  ChargeGauge,
  EmptyState,
} from "@/app/[locale]/recruitment-tracker/_components/shared";
import type { Account } from "@/app/[locale]/recruitment-tracker/_components/types";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import { Link } from "@/i18n/navigation";
import { GAME_SERVER_NAMES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export function RecruitmentAccounts() {
  const locale = useLocale();
  const t = useTranslations();
  const accounts = useQuery(api.recruitment.getOwnAccounts, {});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const reorderAccounts = useMutation(
    api.recruitment.reorderAccounts,
  ).withOptimisticUpdate((store, { accountIds }) => {
    const current = store.getQuery(api.recruitment.getOwnAccounts, {});

    if (!current) {
      return;
    }

    const order = new Map(
      accountIds.map((id, index) => [
        id,
        index,
      ]),
    );

    store.setQuery(
      api.recruitment.getOwnAccounts,
      {},
      [
        ...current,
      ].sort((a, b) => {
        const aOrder = order.get(a._id);
        const bOrder = order.get(b._id);

        if (aOrder === undefined || bOrder === undefined) {
          return 0;
        }

        return aOrder - bOrder;
      }),
    );
  });

  const setAccountArchived = useMutation(
    api.recruitment.setAccountArchived,
  ).withOptimisticUpdate((store, { accountId, archived }) => {
    const current = store.getQuery(api.recruitment.getOwnAccounts, {});

    if (!current) {
      return;
    }

    store.setQuery(
      api.recruitment.getOwnAccounts,
      {},
      current.map((account) =>
        account._id === accountId
          ? {
              ...account,
              archived,
            }
          : account,
      ),
    );
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeAccounts = useMemo(
    () => accounts?.filter((account) => !account.archived) ?? [],
    [
      accounts,
    ],
  );

  const archivedAccounts = useMemo(
    () => accounts?.filter((account) => account.archived) ?? [],
    [
      accounts,
    ],
  );

  async function handleArchiveChange(
    accountId: Id<"recruitmentAccount">,
    archived: boolean,
  ) {
    try {
      await setAccountArchived({
        accountId,
        archived,
      });

      toast.success(
        t(
          archived
            ? "tools.recruitment.accounts.archivedSuccess"
            : "tools.recruitment.accounts.unarchivedSuccess",
        ),
      );
    } catch (error) {
      console.error(error);

      toast.error(
        t(
          archived
            ? "tools.recruitment.accounts.archiveFailed"
            : "tools.recruitment.accounts.unarchiveFailed",
        ),
      );
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = activeAccounts.findIndex(
      (account) => account._id === active.id,
    );

    const newIndex = activeAccounts.findIndex(
      (account) => account._id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(activeAccounts, oldIndex, newIndex);

    void reorderAccounts({
      accountIds: reordered.map((account) => account._id),
    }).catch((error) => {
      console.error(error);
      toast.error(t("tools.recruitment.accounts.reorderFailed"));
    });
  }

  const visibleAccounts = showArchived ? archivedAccounts : activeAccounts;

  const newAccountButton = (
    <Button onClick={() => setDialogOpen(true)}>
      <PlusIcon />
      {t("tools.recruitment.newAccount")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">{t("tools.recruitment.title")}</h1>

          <p className="text-muted-foreground">
            {t("tools.recruitment.description")}
          </p>
        </div>

        {accounts && accounts.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Toggle
              onPressedChange={setShowArchived}
              pressed={showArchived}
              variant="outline"
            >
              <ArchiveIcon />
              {t("tools.recruitment.accounts.archived", {
                count: archivedAccounts.length,
              })}
            </Toggle>

            {newAccountButton}
          </div>
        )}
      </div>

      {locale !== "ja" && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          {t.rich("tools.recruitment.systemNotice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </div>
      )}

      {accounts === undefined ? (
        <MessageBox>{t("common.loading")}</MessageBox>
      ) : accounts.length === 0 ? (
        <EmptyState
          title={t("tools.recruitment.noAccounts")}
          description={t("tools.recruitment.noAccountsHint")}
          action={newAccountButton}
        />
      ) : visibleAccounts.length === 0 ? (
        <MessageBox>
          {t(
            showArchived
              ? "tools.recruitment.accounts.archivedEmpty"
              : "tools.recruitment.accounts.activeEmpty",
          )}
        </MessageBox>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={
              showArchived ? [] : activeAccounts.map((account) => account._id)
            }
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {visibleAccounts.map((account) => (
                <AccountCard
                  key={account._id}
                  account={account}
                  archived={showArchived}
                  onArchiveChange={handleArchiveChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

type AccountCardProps = {
  account: Account;
  archived: boolean;
  onArchiveChange: (
    accountId: Id<"recruitmentAccount">,
    archived: boolean,
  ) => void;
};

function AccountCard({ account, archived, onArchiveChange }: AccountCardProps) {
  const t = useTranslations();

  const sortable = useSortable({
    id: account._id,
    disabled: archived,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  const pullCount = Object.values(account.aggregates ?? {}).reduce(
    (sum, bucket) => sum + bucket.totalPulls,
    0,
  );

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "relative rounded-md border bg-background",
        sortable.isDragging && "z-10 shadow-lg ring-2 ring-ring/40",
        archived && "bg-muted/30",
      )}
    >
      <Link
        href={`/recruitment-tracker/${account._id}`}
        className="flex h-full flex-col gap-5 rounded-md p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div
          className={cn(
            "flex items-baseline justify-between gap-3 pr-9",
            !archived && "pl-8",
          )}
        >
          <h2 className="truncate text-lg font-semibold">{account.name}</h2>

          <span className="shrink-0 text-sm text-muted-foreground">
            {GAME_SERVER_NAMES[account.gameServer]}
          </span>
        </div>

        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <ChargeGauge
            compact
            kind="permanent"
            value={account.permanentCharge}
          />
          <ChargeGauge compact kind="limited" value={account.limitedCharge} />
        </div>

        {account.aggregates && (
          <div className="text-sm text-muted-foreground">
            {t("tools.recruitment.pullCount", {
              count: pullCount,
            })}
          </div>
        )}
      </Link>

      {!archived && (
        <Button
          aria-label={t("tools.recruitment.accounts.reorder", {
            name: account.name,
          })}
          className="absolute top-3 left-2 cursor-grab touch-manipulation text-muted-foreground hover:text-foreground active:cursor-grabbing"
          size="icon-sm"
          type="button"
          variant="ghost"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVerticalIcon />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t("tools.recruitment.accounts.actions", {
              name: account.name,
            })}
            className="absolute top-3 right-2"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => onArchiveChange(account._id, !archived)}
          >
            {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            {t(
              archived
                ? "tools.recruitment.accounts.unarchive"
                : "tools.recruitment.accounts.archive",
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
