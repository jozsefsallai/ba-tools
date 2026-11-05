"use client";

import { useMutation, useQuery } from "convex/react";
import {
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatSidebarSkeleton } from "@/app/[locale]/plana-ai/_components/chat-messages-skeleton";
import { useActivePlanaChat } from "@/app/[locale]/plana-ai/_components/plana-chat-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type PlanaChatSidebarProps = {
  activeChatId?: Id<"planaChat">;
  className?: string;
  collapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  onNavigate?: () => void;
};

type ChatListItem = {
  _id: Id<"planaChat">;
  title: string;
  updatedAt: number;
  displayUpdatedAt: number;
};

type DateGroup = "today" | "yesterday" | "lastWeek" | "older";

const DATE_GROUPS: DateGroup[] = [
  "today",
  "yesterday",
  "lastWeek",
  "older",
];

const CHATS_PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 250;
const DAY_MS = 24 * 60 * 60 * 1000;

function getDateGroup(timestamp: number, startOfToday: number): DateGroup {
  if (timestamp >= startOfToday) {
    return "today";
  }

  if (timestamp >= startOfToday - DAY_MS) {
    return "yesterday";
  }

  return timestamp >= startOfToday - 7 * DAY_MS ? "lastWeek" : "older";
}

export function PlanaChatSidebar({
  activeChatId,
  className,
  collapsed = false,
  onCollapse,
  onExpand,
  onNavigate,
}: PlanaChatSidebarProps) {
  const t = useTranslations();
  const [limit, setLimit] = useState(CHATS_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { activityTimestamps, replaceChatUrl } = useActivePlanaChat();
  const deleteChat = useMutation(api.planaChat.deleteChat);
  const renameChat = useMutation(api.planaChat.renameChat);

  const chatList = useQuery(
    api.planaChat.listRecentChats,
    collapsed
      ? "skip"
      : {
          limit,
        },
  );

  const searchResults = useQuery(
    api.planaChat.searchChats,
    searchQuery && !collapsed
      ? {
          query: searchQuery,
        }
      : "skip",
  );

  useEffect(() => {
    const timeout = setTimeout(
      () => setSearchQuery(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );

    return () => {
      clearTimeout(timeout);
    };
  }, [
    searchInput,
  ]);

  const chats = useMemo(() => {
    if (!chatList) {
      return undefined;
    }

    return [
      ...chatList.chats,
    ]
      .map((chat) => ({
        ...chat,
        displayUpdatedAt: Math.max(
          chat.updatedAt,
          activityTimestamps[chat._id] ?? 0,
        ),
      }))
      .sort((left, right) => right.displayUpdatedAt - left.displayUpdatedAt);
  }, [
    activityTimestamps,
    chatList,
  ]);

  const groupedChats = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0);

    return DATE_GROUPS.map((group) => ({
      group,
      items: (chats ?? []).filter(
        (chat) => getDateGroup(chat.displayUpdatedAt, startOfToday) === group,
      ),
    })).filter(({ items }) => items.length > 0);
  }, [
    chats,
  ]);

  const isSearching = searchQuery.length > 0;
  const hasMore = !isSearching && (chatList?.hasMore ?? false);
  const isLoadingChats = isSearching
    ? searchResults === undefined
    : chatList === undefined;

  function startNewChat() {
    replaceChatUrl(undefined);
    onNavigate?.();
  }

  function renderItem(chat: ChatListItem) {
    return (
      <PlanaChatSidebarItem
        chat={chat}
        isActive={chat._id === activeChatId}
        key={chat._id}
        onDelete={() => handleDelete(chat._id)}
        onNavigate={onNavigate}
        onRename={(title) => handleRename(chat._id, title)}
      />
    );
  }

  async function handleDelete(chatId: Id<"planaChat">) {
    await deleteChat({
      chatId,
    });

    if (activeChatId === chatId) {
      replaceChatUrl(undefined);
    }
  }

  async function handleRename(chatId: Id<"planaChat">, title: string) {
    await renameChat({
      chatId,
      title,
    });
  }

  if (collapsed) {
    return (
      <aside
        className={cn(
          "flex min-h-0 w-12 shrink-0 flex-col items-center gap-2 overflow-hidden bg-muted/30 py-2",
          className,
        )}
      >
        <Button
          aria-label={t("tools.plana.sidebar.expand")}
          onClick={onExpand}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PanelLeftOpenIcon />
        </Button>

        <Button
          aria-label={t("tools.plana.sidebar.newChat")}
          onClick={startNewChat}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PlusIcon />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden bg-muted/30",
        className,
      )}
    >
      <div className="space-y-2 p-2">
        <div className="flex items-center gap-1">
          <Button
            className="min-w-0 flex-1 justify-start"
            onClick={startNewChat}
            size="sm"
            type="button"
            variant="ghost"
          >
            <PlusIcon />
            {t("tools.plana.sidebar.newChat")}
          </Button>

          {onCollapse ? (
            <Button
              aria-label={t("tools.plana.sidebar.collapse")}
              onClick={onCollapse}
              size="icon-sm"
              title={t("tools.plana.sidebar.collapse")}
              type="button"
              variant="ghost"
            >
              <PanelLeftCloseIcon />
            </Button>
          ) : null}
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t("tools.plana.search.placeholder")}
            className="h-8 pl-8 text-sm"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("tools.plana.search.placeholder")}
            value={searchInput}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {isLoadingChats ? (
          <ChatSidebarSkeleton />
        ) : isSearching ? (
          searchResults?.length ? (
            <div className="flex w-full min-w-0 flex-col gap-0.5 p-2 pt-0">
              {searchResults.map((chat) =>
                renderItem({
                  ...chat,
                  displayUpdatedAt: chat.updatedAt,
                }),
              )}
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              {t("tools.plana.search.empty")}
            </p>
          )
        ) : !chats?.length ? (
          <p className="p-4 text-sm text-muted-foreground">
            {t("tools.plana.sidebar.empty")}
          </p>
        ) : (
          <div className="flex w-full min-w-0 flex-col gap-3 p-2 pt-0">
            {groupedChats.map(({ group, items }) => (
              <div className="flex min-w-0 flex-col gap-0.5" key={group}>
                <h3 className="px-3 py-1 font-medium text-muted-foreground text-xs">
                  {t(`tools.plana.dateGroups.${group}`)}
                </h3>
                {items.map(renderItem)}
              </div>
            ))}
          </div>
        )}

        {hasMore ? (
          <div className="flex justify-center p-2">
            <Button
              disabled={isLoadingChats}
              onClick={() => setLimit((current) => current + CHATS_PAGE_SIZE)}
              type="button"
              variant="outline"
            >
              {isLoadingChats ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              {t("common.loadMore")}
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

type PlanaChatSidebarItemProps = {
  chat: ChatListItem;
  isActive: boolean;
  onDelete: () => Promise<void>;
  onNavigate?: () => void;
  onRename: (title: string) => Promise<void>;
};

function PlanaChatSidebarItem({
  chat,
  isActive,
  onDelete,
  onNavigate,
  onRename,
}: PlanaChatSidebarItemProps) {
  const t = useTranslations();
  const { pushChatUrl } = useActivePlanaChat();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const renameCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTitle(chat.title);
  }, [
    chat.title,
  ]);

  async function handleRename() {
    const trimmed = title.trim();

    if (!trimmed) {
      return;
    }

    await onRename(trimmed);
    renameCloseRef.current?.click();
    setRenameOpen(false);
  }

  async function handleDelete() {
    if (deleteInProgress) {
      return;
    }

    setDeleteInProgress(true);

    try {
      await onDelete();
      setDeleteOpen(false);
    } finally {
      setDeleteInProgress(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "group/item relative w-full min-w-0 max-w-full overflow-hidden rounded-lg",
          isActive && "bg-muted",
        )}
      >
        <button
          className="block w-full min-w-0 truncate rounded-lg px-3 py-1.5 pr-9 text-left text-sm transition-colors hover:bg-muted"
          onClick={() => {
            pushChatUrl(chat._id);
            onNavigate?.();
          }}
          title={chat.title}
          type="button"
        >
          {chat.title}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t("tools.plana.sidebar.chatActions")}
              className="absolute top-1/2 right-1 size-7 -translate-y-1/2 opacity-0 transition-opacity group-hover/item:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <PencilIcon />
              {t("tools.plana.sidebar.renameChat")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              variant="destructive"
            >
              <Trash2Icon />
              {t("tools.plana.sidebar.deleteChat")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog onOpenChange={setRenameOpen} open={renameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tools.plana.sidebar.renameTitle")}</DialogTitle>
            <DialogDescription>
              {t("tools.plana.sidebar.renameDescription")}
            </DialogDescription>
          </DialogHeader>

          <Input
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleRename();
              }
            }}
            placeholder={t("tools.plana.sidebar.renamePlaceholder")}
            value={title}
          />

          <DialogFooter>
            <DialogClose ref={renameCloseRef} />

            <Button
              disabled={!title.trim()}
              onClick={() => void handleRename()}
              type="button"
            >
              {t("tools.plana.sidebar.renameSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tools.plana.sidebar.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("tools.plana.sidebar.deleteDescription")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              disabled={deleteInProgress}
              onClick={() => setDeleteOpen(false)}
              type="button"
              variant="outline"
            >
              {t("common.dialogs.confirm.cancel")}
            </Button>

            <Button
              disabled={deleteInProgress}
              onClick={() => void handleDelete()}
              type="button"
              variant="destructive"
            >
              {t("common.dialogs.confirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
