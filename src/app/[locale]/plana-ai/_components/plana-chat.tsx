"use client";

import { Chat, useChat } from "@ai-sdk/react";
import {
  type ChatInit,
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useQuery } from "convex/react";
import {
  ArrowDownIcon,
  LoaderCircleIcon,
  PanelLeftIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { getPlanaConfigStatus } from "@/actions/plana-config";
import { ChatEmptyState } from "@/app/[locale]/plana-ai/_components/chat-empty-state";
import { ChatErrorMessage } from "@/app/[locale]/plana-ai/_components/chat-error-message";
import { ChatInput } from "@/app/[locale]/plana-ai/_components/chat-input";
import {
  ChatMessage,
  type ChatMessageActions,
  ChatPendingIndicator,
} from "@/app/[locale]/plana-ai/_components/chat-message";
import { ChatMessagesSkeleton } from "@/app/[locale]/plana-ai/_components/chat-messages-skeleton";
import { useActivePlanaChat } from "@/app/[locale]/plana-ai/_components/plana-chat-layout";
import { PlanaCompanion } from "@/app/[locale]/plana-ai/_components/plana-companion";
import { PlanaMobileChatSidebar } from "@/app/[locale]/plana-ai/_components/plana-mobile-chat-sidebar";
import { PlanaSettingsDialog } from "@/app/[locale]/plana-ai/_components/plana-settings-dialog";
import { usePlanaBranches } from "@/app/[locale]/plana-ai/_hooks/use-plana-branches";
import { usePlanaChatPersistence } from "@/app/[locale]/plana-ai/_hooks/use-plana-chat-persistence";
import { useStoredToggle } from "@/app/[locale]/plana-ai/_hooks/use-stored-toggle";
import {
  findParentUserMessageId,
  getLatestUserMessageId,
  type PlanaChatMessage,
  toWireMessages,
} from "@/app/[locale]/plana-ai/_lib/chat-persistence";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type PlanaErrorCode,
  type PlanaStatusKey,
  toPlanaErrorCode,
} from "@/lib/ai/message-types";
import type { PlanaExpression } from "@/lib/plana-expressions";
import { cn } from "@/lib/utils";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import {
  getExpressionFromText,
  getResponseFailureErrorKey,
  hasVisibleContent,
} from "./message-utils";

type ResponseFinishPayload = Parameters<
  NonNullable<ChatInit<PlanaChatMessage>["onFinish"]>
>[0];

const ERROR_MESSAGE_KEYS = {
  not_configured: "notConfigured",
  invalid_key: "invalidKey",
  no_credits: "noCredits",
  rate_limited: "rateLimited",
  model_not_found: "modelNotFound",
  model_no_tools: "modelNoTools",
  filtered: "filtered",
  generic: "generic",
} as const satisfies Record<PlanaErrorCode, string>;

const SETTINGS_ERROR_CODES = new Set<PlanaErrorCode>([
  "not_configured",
  "invalid_key",
  "model_not_found",
  "model_no_tools",
]);

function getDraftKey(chatId: string | undefined) {
  return `plana-draft:${chatId ?? "new"}`;
}

function loadDraft(chatId: string | undefined) {
  try {
    return localStorage.getItem(getDraftKey(chatId)) ?? "";
  } catch {
    return "";
  }
}

function saveDraft(chatId: string | undefined, draft: string) {
  try {
    if (draft) {
      localStorage.setItem(getDraftKey(chatId), draft);
    } else {
      localStorage.removeItem(getDraftKey(chatId));
    }
  } catch {}
}

function getLatestAssistantExpression(messages: PlanaChatMessage[]) {
  const latestUserIndex = messages.findLastIndex(
    (message) => message.role === "user",
  );
  const text = messages
    .slice(latestUserIndex + 1)
    .flatMap((message) =>
      message.parts.map((part) => (part.type === "text" ? part.text : "")),
    )
    .join("");

  return text ? getExpressionFromText(text) : null;
}

function isRunningTool(part: PlanaChatMessage["parts"][number] | undefined) {
  return (
    !!part &&
    isToolUIPart(part) &&
    (part.state === "input-streaming" || part.state === "input-available")
  );
}

type PlanaChatProps = {
  chatId?: Id<"planaChat">;
  className?: string;
};

export function PlanaChat({ chatId, className }: PlanaChatProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { replaceChatUrl, notifyChatActivity } = useActivePlanaChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatIdRef = useRef<Id<"planaChat"> | undefined>(chatId);
  const [inputDraft, setInputDraft] = useState("");
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [companionVisible, setCompanionVisible] = useStoredToggle(
    "plana-companion-visible",
    true,
  );

  const [statusKey, setStatusKey] = useState<PlanaStatusKey | null>(null);
  const [rewindTarget, setRewindTarget] = useState<PlanaChatMessage | null>(
    null,
  );
  const [responseError, setResponseError] = useState<PlanaErrorCode | null>(
    null,
  );

  const previousRouteChatIdRef = useRef<Id<"planaChat"> | undefined>(chatId);
  const responseFinishRef = useRef<(payload: ResponseFinishPayload) => void>(
    () => {},
  );
  const getActiveChatIdRef = useRef<() => Id<"planaChat"> | undefined>(
    () => undefined,
  );
  const getTurnOrderRef = useRef<
    (id: string | undefined) => number | undefined
  >(() => undefined);
  const pendingSendContextRef = useRef<Promise<void> | null>(null);

  const chatTitle = useQuery(
    api.planaChat.getChat,
    chatId
      ? {
          chatId,
        }
      : "skip",
  )?.title;

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [
    chatId,
  ]);

  useEffect(() => {
    void getPlanaConfigStatus().then((status) => setHasKey(status.hasKey));
  }, []);

  const chat = useMemo(
    () =>
      new Chat<PlanaChatMessage>({
        transport: new DefaultChatTransport({
          api: "/api/plana-ai/chat",
          prepareSendMessagesRequest: async ({
            body,
            id,
            messageId,
            messages,
            trigger,
          }) => {
            if (pendingSendContextRef.current) {
              await pendingSendContextRef.current;
            }

            return {
              body: {
                ...body,
                chatId: getActiveChatIdRef.current(),
                id,
                locale,
                messageId,
                messages: toWireMessages(messages),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                trigger,
                turnOrder: getTurnOrderRef.current(
                  getLatestUserMessageId(messages),
                ),
              },
            };
          },
        }),
        onData: (part) => {
          if (part.type === "data-status") {
            setStatusKey(part.data.key);
          }
        },
        onFinish: (payload) => responseFinishRef.current(payload),
        sendAutomaticallyWhen:
          lastAssistantMessageIsCompleteWithApprovalResponses,
      }),
    [
      locale,
    ],
  );

  const {
    addToolApprovalResponse,
    clearError,
    error,
    messages,
    regenerate,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat<PlanaChatMessage>({
    chat,
    experimental_throttle: 50,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const { contentRef, isAtBottom, scrollRef, scrollToBottom } =
    useStickToBottom({
      initial: "instant",
      resize: "smooth",
    });
  const {
    branchesRef,
    bumpBranches,
    resetBranches,
    switchBranch,
    trackSibling,
    trimBranches,
  } = usePlanaBranches({
    setMessages,
  });

  const {
    getActiveChatId,
    getTurnOrder,
    isLoadingHistory,
    isLoadingMoreHistory,
    markSendActive,
    markSendInactive,
    persistBranchSwitch,
    persistEdit,
    persistRewind,
    prepareOutgoingUserMessage,
    persistOutgoingUserMessage,
    topSentinelRef,
  } = usePlanaChatPersistence({
    branchesRef,
    bumpBranches,
    chatId,
    isBusy,
    notifyChatActivity,
    replaceChatUrl,
    scrollToBottom,
    setMessages,
    viewportRef: scrollRef,
  });

  getActiveChatIdRef.current = getActiveChatId;
  getTurnOrderRef.current = getTurnOrder;

  useEffect(() => {
    const previousChatId = previousRouteChatIdRef.current;

    if (previousChatId === chatId) {
      return;
    }

    previousRouteChatIdRef.current = chatId;

    const isNewChatUrlCatchUp =
      previousChatId === undefined &&
      chatId !== undefined &&
      chatIdRef.current === chatId;

    if (isNewChatUrlCatchUp) {
      return;
    }

    stop();
    clearAllErrors();
    resetBranches();
    setInputDraft(loadDraft(chatId));
    setMessages([]);
  }, [
    chatId,
  ]);

  useEffect(() => {
    setInputDraft(loadDraft(chatIdRef.current));
  }, []);

  function clearAllErrors() {
    clearError();
    setResponseError(null);
  }

  responseFinishRef.current = ({
    finishReason,
    isAbort,
    isDisconnect,
    isError,
    message,
    messages: finishedMessages,
  }) => {
    setStatusKey(null);

    const isAssistantReply = message.role === "assistant";
    const isEmptyReply = isAssistantReply && !hasVisibleContent(message);

    if (isEmptyReply && finishedMessages.at(-1)?.id === message.id) {
      setMessages(finishedMessages.slice(0, -1));
    }

    if (isAbort || isDisconnect || isError) {
      return;
    }

    const failureKey = getResponseFailureErrorKey(finishReason);

    if (failureKey || isEmptyReply) {
      setResponseError(failureKey ?? "generic");
    }
  };

  const hasError = (status === "error" && !!error) || !!responseError;
  const errorCode: PlanaErrorCode =
    responseError ?? toPlanaErrorCode(error?.message);
  const planaExpression: PlanaExpression = hasError
    ? "sad"
    : (getLatestAssistantExpression(messages) ??
      (isBusy ? "thinking" : "idle"));
  const latestAssistantMessageId = messages.findLast(
    (message) => message.role === "assistant",
  )?.id;
  const lastMessage = messages.at(-1);
  const lastPart = lastMessage?.parts.at(-1);
  const showPendingIndicator =
    isBusy &&
    (lastMessage?.role !== "assistant" ||
      (!isRunningTool(lastPart) && lastPart?.type !== "text"));
  const isAwaitingApproval = lastMessage?.parts.some(
    (part) => isToolUIPart(part) && part.state === "approval-requested",
  );
  const showUnanswered =
    status === "ready" &&
    !hasError &&
    !isLoadingHistory &&
    lastMessage?.role === "user";

  useEffect(() => {
    if (status !== "ready" || isLoadingHistory || !latestAssistantMessageId) {
      return;
    }

    const latestAssistant = messages.find(
      (message) => message.id === latestAssistantMessageId,
    );
    const parentId = findParentUserMessageId(
      messages,
      latestAssistantMessageId,
    );

    if (!latestAssistant || !parentId || !hasVisibleContent(latestAssistant)) {
      return;
    }

    const branch = branchesRef.current[parentId];
    const isTracked = branch?.siblings.some(
      (message) =>
        message.id === latestAssistantMessageId && message === latestAssistant,
    );

    if (!isTracked) {
      trackSibling(parentId, latestAssistant);
    }
  }, [
    isLoadingHistory,
    latestAssistantMessageId,
    messages,
    status,
  ]);

  function updateDraft(value: string) {
    setInputDraft(value);
    saveDraft(chatIdRef.current, value);
  }

  async function sendText(text: string) {
    clearAllErrors();
    setStatusKey(null);
    updateDraft("");
    void scrollToBottom();

    const userMessage = prepareOutgoingUserMessage(text);
    pendingSendContextRef.current = persistOutgoingUserMessage(userMessage);
    markSendActive();

    try {
      await sendMessage(userMessage);
    } finally {
      pendingSendContextRef.current = null;
      markSendInactive();
    }
  }

  function startNewChat() {
    stop();
    clearAllErrors();
    resetBranches();
    setInputDraft(loadDraft(undefined));
    setMessages([]);
    chatIdRef.current = undefined;
    replaceChatUrl(undefined);
  }

  function regenerateLatest() {
    clearAllErrors();
    setStatusKey(null);
    void regenerate();
  }

  function handleRegenerate(assistantMessage: PlanaChatMessage) {
    if (assistantMessage.id === latestAssistantMessageId) {
      regenerateLatest();
    }
  }

  function handleSwitchBranch(
    assistantMessage: PlanaChatMessage,
    delta: -1 | 1,
  ) {
    const switched = switchBranch(messages, assistantMessage, delta);

    if (switched) {
      persistBranchSwitch(
        switched.parentUserMessageId,
        switched.selectedVariantIndex,
      );
    }
  }

  async function handleEdit(userMessage: PlanaChatMessage, text: string) {
    const index = messages.findIndex(
      (message) => message.id === userMessage.id,
    );

    if (index === -1) {
      return;
    }

    const edited: PlanaChatMessage = {
      ...userMessage,
      parts: [
        {
          type: "text",
          text,
        },
      ],
    };
    const nextMessages = [
      ...messages.slice(0, index),
      edited,
    ];

    clearAllErrors();
    trimBranches(messages.slice(0, index));
    setMessages(nextMessages);
    void scrollToBottom();
    pendingSendContextRef.current = persistEdit(edited);
    markSendActive();

    try {
      await regenerate();
    } finally {
      pendingSendContextRef.current = null;
      markSendInactive();
    }
  }

  function confirmRewind() {
    const assistantMessage = rewindTarget;

    setRewindTarget(null);

    if (!assistantMessage) {
      return;
    }

    const index = messages.findIndex(
      (message) => message.id === assistantMessage.id,
    );
    const parentId = findParentUserMessageId(messages, assistantMessage.id);

    if (index === -1 || !parentId) {
      return;
    }

    const nextMessages = messages.slice(0, index + 1);

    clearAllErrors();
    setMessages(nextMessages);
    trimBranches(nextMessages, assistantMessage);
    void persistRewind(parentId);
    inputRef.current?.focus();
  }

  const actionsRef = useRef<ChatMessageActions>(null as never);

  actionsRef.current = {
    edit: (message, text) => void handleEdit(message, text),
    regenerate: handleRegenerate,
    respondToApproval: (id, approved) => {
      void addToolApprovalResponse({
        id,
        approved,
        reason: approved
          ? undefined
          : "Sensei declined this in the app. Nothing was saved, and no further approval is pending.",
      });
    },
    rewind: setRewindTarget,
    switchBranch: handleSwitchBranch,
  };

  const stableActions = useMemo<ChatMessageActions>(
    () => ({
      edit: (...args) => actionsRef.current.edit(...args),
      regenerate: (...args) => actionsRef.current.regenerate(...args),
      respondToApproval: (...args) =>
        actionsRef.current.respondToApproval(...args),
      rewind: (...args) => actionsRef.current.rewind(...args),
      switchBranch: (...args) => actionsRef.current.switchBranch(...args),
    }),
    [],
  );

  const showEmptyState =
    !isLoadingHistory && !chatId && messages.length === 0 && !hasError;
  const canAct = !isBusy && !isAwaitingApproval;
  const composer = (
    <ChatInput
      isBusy={isBusy}
      onSend={(text) => void sendText(text)}
      onStop={stop}
      onValueChange={updateDraft}
      ref={inputRef}
      value={inputDraft}
    />
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-1", className)}>
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <PlanaMobileChatSidebar>
            <Button
              aria-label={t("tools.plana.sidebar.open")}
              className="shrink-0 md:hidden"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PanelLeftIcon />
            </Button>
          </PlanaMobileChatSidebar>

          <h1 className="min-w-0 flex-1 truncate font-medium text-sm">
            {chatTitle ?? t("tools.plana.title")}
          </h1>

          <Button
            aria-label={t("tools.plana.input.newChat")}
            className="shrink-0 md:hidden"
            onClick={startNewChat}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <PlusIcon />
          </Button>
          <PlanaSettingsDialog
            onOpenChange={setSettingsOpen}
            onSaved={setHasKey}
            open={settingsOpen}
          >
            <Button
              aria-label={t("tools.plana.settings.openSettings")}
              size="icon-sm"
              title={t("tools.plana.settings.openSettings")}
              type="button"
              variant="ghost"
            >
              <SettingsIcon />
            </Button>
          </PlanaSettingsDialog>
          <Button
            aria-label={
              companionVisible
                ? t("tools.plana.companion.hide")
                : t("tools.plana.companion.show")
            }
            className="hidden lg:inline-flex"
            onClick={() => setCompanionVisible(!companionVisible)}
            size="icon-sm"
            title={
              companionVisible
                ? t("tools.plana.companion.hide")
                : t("tools.plana.companion.show")
            }
            type="button"
            variant="ghost"
          >
            {companionVisible ? (
              <PanelRightCloseIcon />
            ) : (
              <PanelRightOpenIcon />
            )}
          </Button>
        </header>

        {showEmptyState ? (
          <ChatEmptyState
            composer={composer}
            hasKey={hasKey}
            onOpenSettings={() => setSettingsOpen(true)}
            onSelectSuggestion={(text) => void sendText(text)}
          />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
              <div
                className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6"
                ref={contentRef}
              >
                {isLoadingHistory ? (
                  <ChatMessagesSkeleton />
                ) : (
                  <>
                    <div
                      className="flex min-h-px justify-center"
                      ref={topSentinelRef}
                    >
                      {isLoadingMoreHistory && (
                        <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {messages.map((message, index) => {
                      const isLatestAssistant =
                        message.id === latestAssistantMessageId;
                      const parentId =
                        isLatestAssistant && canAct
                          ? findParentUserMessageId(messages, message.id)
                          : null;
                      const branch = parentId
                        ? branchesRef.current[parentId]
                        : undefined;
                      const isStreamingMessage =
                        isBusy &&
                        index === messages.length - 1 &&
                        message.role === "assistant";

                      return (
                        <ChatMessage
                          actions={stableActions}
                          branchCount={branch?.siblings.length}
                          branchIndex={branch?.activeIndex}
                          canEdit={canAct && message.role === "user"}
                          canRegenerate={
                            canAct && isLatestAssistant && !showUnanswered
                          }
                          canRewind={
                            canAct &&
                            message.role === "assistant" &&
                            !isLatestAssistant
                          }
                          isStreaming={isStreamingMessage}
                          key={message.id}
                          message={message}
                        />
                      );
                    })}
                    {showPendingIndicator && (
                      <ChatPendingIndicator
                        label={
                          statusKey
                            ? t(`tools.plana.status.${statusKey}`)
                            : undefined
                        }
                      />
                    )}
                    {hasError && (
                      <ChatErrorMessage
                        message={t(
                          `tools.plana.errors.${ERROR_MESSAGE_KEYS[errorCode]}`,
                        )}
                        onOpenSettings={
                          SETTINGS_ERROR_CODES.has(errorCode)
                            ? () => setSettingsOpen(true)
                            : undefined
                        }
                        onRetry={regenerateLatest}
                      />
                    )}
                    {showUnanswered && (
                      <ChatErrorMessage
                        message={t("tools.plana.message.unanswered")}
                        onRetry={regenerateLatest}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="relative shrink-0 px-4 pb-3">
              {!isAtBottom && !isLoadingHistory ? (
                <Button
                  aria-label={t("tools.plana.input.scrollToBottom")}
                  className="absolute -top-11 left-1/2 size-8 -translate-x-1/2 rounded-full shadow-md"
                  onClick={() => void scrollToBottom()}
                  size="icon"
                  title={t("tools.plana.input.scrollToBottom")}
                  type="button"
                  variant="outline"
                >
                  <ArrowDownIcon />
                </Button>
              ) : null}
              <div className="mx-auto w-full max-w-3xl">
                {composer}
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                  {t("tools.plana.input.disclaimer")}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      <PlanaCompanion expression={planaExpression} visible={companionVisible} />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRewindTarget(null);
          }
        }}
        open={!!rewindTarget}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tools.plana.message.rewindTitle")}</DialogTitle>
            <DialogDescription>
              {t("tools.plana.message.rewindDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setRewindTarget(null)}
              type="button"
              variant="outline"
            >
              {t("common.dialogs.confirm.cancel")}
            </Button>
            <Button onClick={confirmRewind} type="button" variant="destructive">
              {t("tools.plana.message.rewind")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
