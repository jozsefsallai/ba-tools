"use client";

import { useActivePlanaChat } from "@/app/plana-ai/_components/plana-chat-layout";
import { ChatSidebarSkeleton } from "@/app/plana-ai/_components/chat-messages-skeleton";
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
import { useMutation, useQuery } from "convex/react";
import { LoaderCircleIcon, MoreHorizontalIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type PlanaChatSidebarProps = {
  activeChatId?: Id<"planaChat">;
  className?: string;
  collapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
};

type ChatListItem = {
  _id: Id<"planaChat">;
  title: string;
  updatedAt: number;
  displayUpdatedAt: number;
};

const CHATS_PAGE_SIZE = 30;

export function PlanaChatSidebar({
  activeChatId,
  className,
  collapsed = false,
  onCollapse,
  onExpand,
}: PlanaChatSidebarProps) {
  const t = useTranslations();
  const now = useNow();
  const [limit, setLimit] = useState(CHATS_PAGE_SIZE);
  const { activityTimestamps, replaceChatUrl } = useActivePlanaChat();
  const deleteChat = useMutation(api.planaChat.deleteChat);
  const renameChat = useMutation(api.planaChat.renameChat);

  const chatList = useQuery(
    api.planaChat.listRecentChats,
    collapsed ? "skip" : { limit },
  );

  const chats = useMemo(() => {
    if (!chatList) {
      return undefined;
    }

    return [...chatList.chats]
      .map((chat) => ({
        ...chat,
        displayUpdatedAt: Math.max(
          chat.updatedAt,
          activityTimestamps[chat._id] ?? 0,
        ),
      }))
      .sort((left, right) => right.displayUpdatedAt - left.displayUpdatedAt);
  }, [activityTimestamps, chatList]);

  const hasMore = chatList?.hasMore ?? false;
  const isLoadingChats = chatList === undefined;

  function startNewChat() {
    replaceChatUrl(undefined);
  }

  async function handleDelete(chatId: Id<"planaChat">) {
    await deleteChat({ chatId });

    if (activeChatId === chatId) {
      replaceChatUrl(undefined);
    }
  }

  async function handleRename(chatId: Id<"planaChat">, title: string) {
    await renameChat({ chatId, title });
  }

  if (collapsed) {
    return (
      <aside
        className={cn(
          "flex min-h-0 w-12 shrink-0 flex-col items-center gap-2 overflow-hidden rounded-3xl border bg-background py-3 shadow-sm",
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
          variant="outline"
        >
          <PlusIcon />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden rounded-3xl border bg-background shadow-sm",
        className,
      )}
    >
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <Button
            className="min-w-0 flex-1 justify-start"
            onClick={startNewChat}
            size="sm"
            type="button"
            variant="outline"
          >
            <PlusIcon />
            {t("tools.plana.sidebar.newChat")}
          </Button>

          {onCollapse ? (
            <Button
              aria-label={t("tools.plana.sidebar.collapse")}
              onClick={onCollapse}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <PanelLeftCloseIcon />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {isLoadingChats ? (
          <ChatSidebarSkeleton />
        ) : !chats?.length ? (
          <p className="p-4 text-sm text-muted-foreground">
            {t("tools.plana.sidebar.empty")}
          </p>
        ) : (
          <div className="flex w-full min-w-0 flex-col gap-1 p-2">
            {chats.map((chat) => (
              <PlanaChatSidebarItem
                chat={chat}
                isActive={chat._id === activeChatId}
                key={chat._id}
                now={now}
                onDelete={() => handleDelete(chat._id)}
                onRename={(title) => handleRename(chat._id, title)}
              />
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
  now: Date;
  onDelete: () => Promise<void>;
  onRename: (title: string) => Promise<void>;
};

function PlanaChatSidebarItem({
  chat,
  isActive,
  now,
  onDelete,
  onRename,
}: PlanaChatSidebarItemProps) {
  const t = useTranslations();
  const formatter = useFormatter();
  const { pushChatUrl } = useActivePlanaChat();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const renameCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTitle(chat.title);
  }, [chat.title]);

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
          className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] rounded-lg px-3 py-2 pr-9 text-left transition-colors hover:bg-muted/70"
          onClick={() => pushChatUrl(chat._id)}
          title={chat.title}
          type="button"
        >
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
            {chat.title}
          </span>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
            {formatter.relativeTime(new Date(chat.displayUpdatedAt), now)}
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t("tools.plana.sidebar.chatActions")}
              className="absolute top-1/2 right-1 size-7 -translate-y-1/2 opacity-0 transition-opacity group-hover/item:opacity-100 data-[state=open]:opacity-100"
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
