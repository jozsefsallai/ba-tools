"use client";

import { ChatEmptyState } from "@/app/plana-ai/_components/chat-empty-state";
import { ChatErrorMessage } from "@/app/plana-ai/_components/chat-error-message";
import { ChatInput } from "@/app/plana-ai/_components/chat-input";
import { ChatMessage } from "@/app/plana-ai/_components/chat-message";
import { PlanaSettingsDialog } from "@/app/plana-ai/_components/plana-settings-dialog";
import { Plana } from "@/components/plana";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PlanaExpression } from "@/lib/plana";
import { cn } from "@/lib/utils";
import { Chat, useChat } from "@ai-sdk/react";
import { type ChatInit, DefaultChatTransport, type UIMessage } from "ai";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getExpressionFromText,
  getResponseFailureErrorKey,
  getVisibleAssistantText,
} from "./message-utils";

type PlanaChatMessage = UIMessage<unknown, Record<string, never>>;
type PlanaResponseErrorKey = "filtered" | "generic";
type ResponseFinishPayload = Parameters<
  NonNullable<ChatInit<PlanaChatMessage>["onFinish"]>
>[0];
type PlanaBranch = {
  activeIndex: number;
  siblings: PlanaChatMessage[];
};
type PlanaBranches = Record<string, PlanaBranch>;

function getTextFromMessage(message: PlanaChatMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function findParentUserMessageId(
  messages: PlanaChatMessage[],
  assistantMessageId: string,
) {
  const assistantIndex = messages.findIndex(
    (message) => message.id === assistantMessageId,
  );

  if (assistantIndex === -1) {
    return null;
  }

  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") {
      return messages[index].id;
    }
  }

  return null;
}

function getLatestAssistantExpression(messages: PlanaChatMessage[]) {
  const latestUserIndex = messages.findLastIndex(
    (message) => message.role === "user",
  );
  const messagesAfterLatestUser =
    latestUserIndex === -1 ? messages : messages.slice(latestUserIndex + 1);
  const latestAssistant = [...messagesAfterLatestUser]
    .reverse()
    .find((message) => message.role === "assistant");

  const text = latestAssistant?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  return text ? getExpressionFromText(text) : null;
}

export function PlanaChat() {
  const t = useTranslations();
  const avatarPanelRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const branchesRef = useRef<PlanaBranches>({});
  const [, rerenderBranches] = useState(0);
  const [inputDraft, setInputDraft] = useState("");
  const [planaScale, setPlanaScale] = useState(1);
  const [optimisticExpression, setOptimisticExpression] =
    useState<PlanaExpression | null>(null);
  const wasBusyRef = useRef(false);
  const responseFinishRef = useRef<(payload: ResponseFinishPayload) => void>(
    () => {},
  );
  const [responseError, setResponseError] =
    useState<PlanaResponseErrorKey | null>(null);
  const chat = useMemo(
    () =>
      new Chat<PlanaChatMessage>({
        transport: new DefaultChatTransport({
          api: "/api/plana-ai/chat",
          prepareSendMessagesRequest: ({
            body,
            id,
            messageId,
            messages,
            trigger,
          }) => ({
            body: {
              ...body,
              id,
              messageId,
              messages,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              trigger,
            },
          }),
        }),
        onFinish: (payload) => responseFinishRef.current(payload),
      }),
    [],
  );
  const {
    clearError,
    error,
    messages,
    regenerate,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat<PlanaChatMessage>({ chat });

  function clearAllErrors() {
    clearError();
    setResponseError(null);
  }

  responseFinishRef.current = ({
    finishReason,
    isAbort,
    isError,
    message,
    messages: finishedMessages,
  }) => {
    if (isAbort || isError) {
      return;
    }

    const explicitErrorKey = getResponseFailureErrorKey(finishReason);
    const visibleText = getVisibleAssistantText(message);
    const lastMessage = finishedMessages.at(-1);
    const missingResponse = lastMessage?.role === "user";
    const emptyAssistantResponse =
      lastMessage?.role === "assistant" && visibleText.length === 0;

    if (!explicitErrorKey && !missingResponse && !emptyAssistantResponse) {
      return;
    }

    setResponseError(explicitErrorKey ?? "generic");

    if (emptyAssistantResponse) {
      setMessages(finishedMessages.slice(0, -1));
    }
  };

  const isBusy = status === "submitted" || status === "streaming";
  const latestExpression = getLatestAssistantExpression(messages);
  const hasError = (status === "error" && !!error) || !!responseError;
  const planaExpression: PlanaExpression = hasError
    ? "sad"
    : isBusy || optimisticExpression
      ? (optimisticExpression ?? "thinking")
      : (latestExpression ?? "idle");
  const latestAssistantMessageId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;
  const errorMessage = hasError
    ? error?.message === "Plana AI is not configured"
      ? t("tools.plana.errors.notConfigured")
      : responseError === "filtered"
        ? t("tools.plana.errors.filtered")
        : t("tools.plana.errors.generic")
    : "";
  const shouldShowTypingPlaceholder =
    isBusy && messages.at(-1)?.role === "user";
  const typingPlaceholderMessage: PlanaChatMessage = {
    id: "plana-typing-placeholder",
    role: "assistant",
    parts: [],
  };

  function bumpBranches() {
    rerenderBranches((version) => version + 1);
  }

  function upsertBranchSibling(
    parentUserMessageId: string,
    assistantMessage: PlanaChatMessage,
    makeActive = false,
  ) {
    const branch = branchesRef.current[parentUserMessageId] ?? {
      activeIndex: 0,
      siblings: [],
    };
    const existingIndex = branch.siblings.findIndex(
      (message) => message.id === assistantMessage.id,
    );

    if (existingIndex === -1) {
      branch.siblings = [...branch.siblings, assistantMessage];
      branch.activeIndex = makeActive
        ? branch.siblings.length - 1
        : branch.activeIndex;
      branchesRef.current[parentUserMessageId] = branch;
      bumpBranches();
      return;
    }

    branch.siblings = branch.siblings.map((message, index) =>
      index === existingIndex ? assistantMessage : message,
    );

    if (makeActive && branch.activeIndex !== existingIndex) {
      branch.activeIndex = existingIndex;
      bumpBranches();
      return;
    }

    branchesRef.current[parentUserMessageId] = branch;
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, status, shouldShowTypingPlaceholder, hasError]);

  useEffect(() => {
    if (isBusy && !hasError) {
      setOptimisticExpression((current) => current ?? "thinking");
    }
  }, [hasError, isBusy]);

  useEffect(() => {
    if (wasBusyRef.current && !isBusy) {
      setOptimisticExpression(null);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }

    wasBusyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (!latestAssistant) {
      return;
    }

    const parentUserMessageId = findParentUserMessageId(
      messages,
      latestAssistant.id,
    );

    if (!parentUserMessageId) {
      return;
    }

    upsertBranchSibling(parentUserMessageId, latestAssistant, true);
  }, [messages, status]);

  useEffect(() => {
    const panel = avatarPanelRef.current;

    if (!panel) {
      return;
    }

    const updateScale = () => {
      const { height, width } = panel.getBoundingClientRect();
      const scaleByWidth = (width - 64) / 500;
      const scaleByHeight = (height + 96) / 850;
      const nextScale = Math.min(
        Math.max(Math.min(scaleByWidth, scaleByHeight), 0.95),
        1.55,
      );

      setPlanaScale(nextScale);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(panel);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  function sendText(text: string) {
    clearAllErrors();
    setOptimisticExpression("thinking");
    setInputDraft("");
    void sendMessage({ text });
  }

  function clearChat() {
    stop();
    clearAllErrors();
    branchesRef.current = {};
    bumpBranches();
    setInputDraft("");
    setOptimisticExpression(null);
    setMessages([]);
  }

  function handleRetry() {
    clearAllErrors();
    setOptimisticExpression("thinking");

    if (latestAssistantMessageId) {
      void regenerate({ messageId: latestAssistantMessageId });
      return;
    }

    void regenerate();
  }

  function handleRegenerate(assistantMessage: PlanaChatMessage) {
    if (assistantMessage.id !== latestAssistantMessageId) {
      return;
    }

    const parentUserMessageId = findParentUserMessageId(
      messages,
      assistantMessage.id,
    );

    if (parentUserMessageId) {
      upsertBranchSibling(parentUserMessageId, assistantMessage, true);
    }

    clearAllErrors();
    setOptimisticExpression("thinking");
    void regenerate({ messageId: assistantMessage.id });
  }

  function switchBranch(assistantMessage: PlanaChatMessage, delta: -1 | 1) {
    const parentUserMessageId = findParentUserMessageId(
      messages,
      assistantMessage.id,
    );

    if (!parentUserMessageId) {
      return;
    }

    const branch = branchesRef.current[parentUserMessageId];

    if (!branch) {
      return;
    }

    const nextIndex = Math.min(
      Math.max(branch.activeIndex + delta, 0),
      branch.siblings.length - 1,
    );

    if (nextIndex === branch.activeIndex) {
      return;
    }

    const messageIndex = messages.findIndex(
      (message) => message.id === assistantMessage.id,
    );

    if (messageIndex === -1) {
      return;
    }

    branch.activeIndex = nextIndex;
    setMessages(
      messages.map((message, index) =>
        index === messageIndex ? branch.siblings[nextIndex] : message,
      ),
    );
    bumpBranches();
  }

  function rewindTo(assistantMessage: PlanaChatMessage) {
    const assistantIndex = messages.findIndex(
      (message) => message.id === assistantMessage.id,
    );

    if (assistantIndex === -1) {
      return;
    }

    const nextMessages = messages.slice(0, assistantIndex + 1);
    const remainingUserIds = new Set(
      nextMessages
        .filter((message) => message.role === "user")
        .map((message) => message.id),
    );

    stop();
    clearAllErrors();
    setMessages(nextMessages);
    branchesRef.current = Object.fromEntries(
      Object.entries(branchesRef.current).filter(([userMessageId]) =>
        remainingUserIds.has(userMessageId),
      ),
    );

    const parentUserMessageId = findParentUserMessageId(
      messages,
      assistantMessage.id,
    );

    if (parentUserMessageId) {
      const branch = branchesRef.current[parentUserMessageId];

      if (branch) {
        const siblingIndex = branch.siblings.findIndex(
          (message) => message.id === assistantMessage.id,
        );

        if (siblingIndex !== -1) {
          branch.siblings = branch.siblings.slice(0, siblingIndex + 1);
          branch.activeIndex = siblingIndex;
        }
      }
    }

    bumpBranches();
    setInputDraft("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  return (
    <div className="grid h-[calc(100dvh-8rem)] min-h-0 gap-4 overflow-hidden rounded-3xl border bg-muted/20 p-2 md:grid-cols-[minmax(360px,1fr)_minmax(0,1.25fr)] xl:grid-cols-[minmax(480px,1.05fr)_minmax(0,1.15fr)] md:p-4">
      <aside
        className="relative hidden min-h-0 overflow-hidden rounded-3xl border bg-gradient-to-b from-background via-background to-muted/60 md:block"
        ref={avatarPanelRef}
      >
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <div
            className="translate-y-[10%]"
            style={{
              transform: `translateY(10%) scale(${planaScale})`,
              transformOrigin: "bottom center",
            }}
          >
            <Plana expression={planaExpression} inline />
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border bg-background shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h1 className="font-semibold tracking-tight">
              {t("tools.plana.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("tools.plana.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PlanaSettingsDialog>
              <Button
                aria-label={t("tools.plana.settings.openSettings")}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <SettingsIcon />
              </Button>
            </PlanaSettingsDialog>
            <Button
              disabled={messages.length === 0 && !error}
              onClick={clearChat}
              size="sm"
              type="button"
              variant="outline"
            >
              <PlusIcon />
              {t("tools.plana.input.newChat")}
            </Button>
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div
            className={cn("flex min-h-full flex-col gap-5 p-4 md:p-6", {
              "justify-center": messages.length === 0,
            })}
          >
            {messages.length === 0 ? (
              <ChatEmptyState onSelectSuggestion={sendText} />
            ) : (
              <>
                {messages.map((message, index) => (
                  <ChatMessage
                    branches={
                      message.role === "assistant" &&
                      message.id === latestAssistantMessageId &&
                      !isBusy
                        ? (() => {
                            const parentId = findParentUserMessageId(
                              messages,
                              message.id,
                            );
                            const branch = parentId
                              ? branchesRef.current[parentId]
                              : undefined;

                            return branch
                              ? {
                                  activeIndex: branch.activeIndex,
                                  count: branch.siblings.length,
                                }
                              : undefined;
                          })()
                        : undefined
                    }
                    isStreaming={
                      isBusy &&
                      index === messages.length - 1 &&
                      message.role === "assistant"
                    }
                    key={message.id}
                    message={message}
                    onRegenerate={
                      message.role === "assistant" &&
                      message.id === latestAssistantMessageId &&
                      !isBusy
                        ? handleRegenerate
                        : undefined
                    }
                    onRewind={
                      message.role === "assistant" &&
                      message.id !== latestAssistantMessageId &&
                      !isBusy
                        ? rewindTo
                        : undefined
                    }
                    onSwitchBranch={
                      message.role === "assistant" &&
                      message.id === latestAssistantMessageId &&
                      !isBusy
                        ? (delta) => switchBranch(message, delta)
                        : undefined
                    }
                  />
                ))}
                {shouldShowTypingPlaceholder && (
                  <ChatMessage isStreaming message={typingPlaceholderMessage} />
                )}
                {hasError && (
                  <ChatErrorMessage
                    message={errorMessage}
                    onRetry={handleRetry}
                  />
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t bg-background/90 p-3 backdrop-blur md:p-4">
          <ChatInput
            onClear={clearChat}
            onSend={sendText}
            onStop={stop}
            onValueChange={setInputDraft}
            ref={inputRef}
            status={status}
            value={inputDraft}
          />
        </div>
      </section>
    </div>
  );
}
