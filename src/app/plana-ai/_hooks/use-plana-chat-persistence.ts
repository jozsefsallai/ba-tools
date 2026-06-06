"use client";

import {
  type PlanaBranches,
  type PlanaChatMessage,
  type PlanaTurnDoc,
  findParentUserMessageId,
  findTurnOrderForAssistantMessage,
  mergeTurnPages,
  messageToParts,
  turnsToMessagesAndBranches,
} from "@/app/plana-ai/_lib/chat-persistence";
import type { ChatStatus } from "ai";
import { generateId } from "ai";
import { useMutation, usePaginatedQuery } from "convex/react";
import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const TURNS_PAGE_SIZE = 30;

type UsePlanaChatPersistenceOptions = {
  branchesRef: MutableRefObject<PlanaBranches>;
  bumpBranches: () => void;
  chatId?: Id<"planaChat">;
  isBusy: boolean;
  messages: PlanaChatMessage[];
  replaceChatUrl?: (chatId?: Id<"planaChat">) => void;
  notifyChatActivity?: (chatId: Id<"planaChat">) => void;
  setMessages: Dispatch<SetStateAction<PlanaChatMessage[]>>;
  status: ChatStatus;
};

function getTurnsSignature(turns: PlanaTurnDoc[]) {
  return turns
    .map(
      (turn) =>
        `${turn._id}:${turn.selectedVariantIndex}:${turn.assistantVariants.length}`,
    )
    .join("|");
}

export function usePlanaChatPersistence({
  branchesRef,
  bumpBranches,
  chatId,
  isBusy,
  messages,
  replaceChatUrl,
  notifyChatActivity,
  setMessages,
  status,
}: UsePlanaChatPersistenceOptions) {
  const chatIdRef = useRef<Id<"planaChat"> | undefined>(chatId);
  const bumpBranchesRef = useRef(bumpBranches);
  const pendingTurnOrderRef = useRef<number | null>(null);
  const turnOrderByUserClientIdRef = useRef<Record<string, number>>({});
  const loadedTurnsRef = useRef<PlanaTurnDoc[]>([]);
  const hydratedChatIdRef = useRef<Id<"planaChat"> | null>(null);
  const loadedTurnsSignatureRef = useRef("");
  const loadingMoreHistoryRef = useRef(false);
  const persistedAssistantIdsRef = useRef<Set<string>>(new Set());
  const activeSendRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  const appendTurn = useMutation(api.planaChat.appendTurn);
  const completeAssistantVariant = useMutation(
    api.planaChat.completeAssistantVariant,
  );
  const createChatWithTurn = useMutation(api.planaChat.createChatWithTurn);
  const rewindFromTurn = useMutation(api.planaChat.rewindFromTurn);
  const selectVariant = useMutation(api.planaChat.selectVariant);

  const {
    loadMore,
    results: turnPages,
    status: turnsStatus,
  } = usePaginatedQuery(
    api.planaChat.getTurnsPaginated,
    chatId ? { chatId } : "skip",
    { initialNumItems: TURNS_PAGE_SIZE },
  );

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    bumpBranchesRef.current = bumpBranches;
  }, [bumpBranches]);

  useEffect(() => {
    if (!chatId) {
      hydratedChatIdRef.current = null;
      loadedTurnsRef.current = [];
      loadedTurnsSignatureRef.current = "";
      turnOrderByUserClientIdRef.current = {};
      persistedAssistantIdsRef.current = new Set();
      return;
    }

    if (hydratedChatIdRef.current !== chatId) {
      hydratedChatIdRef.current = null;
      loadedTurnsRef.current = [];
      loadedTurnsSignatureRef.current = "";
      turnOrderByUserClientIdRef.current = {};
      persistedAssistantIdsRef.current = new Set();
    }
  }, [chatId]);

  useEffect(() => {
    if (turnsStatus === "LoadingMore") {
      loadingMoreHistoryRef.current = true;
      isLoadingMoreRef.current = true;
    }

    if (turnsStatus !== "LoadingMore") {
      isLoadingMoreRef.current = false;
    }
  }, [turnsStatus]);

  useEffect(() => {
    if (
      !chatId ||
      isBusy ||
      activeSendRef.current ||
      turnsStatus === "LoadingFirstPage"
    ) {
      return;
    }

    const mergedTurns = mergeTurnPages([], turnPages);
    const nextSignature = getTurnsSignature(mergedTurns);

    if (nextSignature === loadedTurnsSignatureRef.current) {
      return;
    }

    loadedTurnsSignatureRef.current = nextSignature;
    loadedTurnsRef.current = mergedTurns;

    const isInitialHydration = hydratedChatIdRef.current !== chatId;
    const isPrepend =
      loadingMoreHistoryRef.current && turnsStatus !== "LoadingMore";

    if (!isInitialHydration && !isPrepend) {
      return;
    }

    loadingMoreHistoryRef.current = false;

    const {
      branches,
      messages: hydratedMessages,
      turnOrderByUserClientId,
    } = turnsToMessagesAndBranches(mergedTurns);

    for (const turn of mergedTurns) {
      for (const variant of turn.assistantVariants) {
        persistedAssistantIdsRef.current.add(variant.clientId);
      }
    }

    turnOrderByUserClientIdRef.current = turnOrderByUserClientId;
    branchesRef.current = branches;
    bumpBranchesRef.current();
    setMessages(hydratedMessages);
    hydratedChatIdRef.current = chatId;

    if (isPrepend) {
      shouldStickToBottomRef.current = false;
      requestAnimationFrame(() => {
        const viewport = scrollContainerRef.current?.closest(
          '[data-slot="scroll-area-viewport"]',
        );

        if (!(viewport instanceof HTMLElement)) {
          return;
        }

        const previousScrollHeight = viewport.dataset.previousScrollHeight;

        if (previousScrollHeight) {
          const heightDelta =
            viewport.scrollHeight - Number.parseInt(previousScrollHeight, 10);
          viewport.scrollTop = heightDelta;
          delete viewport.dataset.previousScrollHeight;
        }
      });
      return;
    }

    if (isInitialHydration) {
      shouldStickToBottomRef.current = true;
    }
  }, [branchesRef, chatId, isBusy, setMessages, turnPages, turnsStatus]);

  useEffect(() => {
    if (
      !chatId ||
      turnsStatus !== "CanLoadMore" ||
      isBusy ||
      isLoadingMoreRef.current
    ) {
      return;
    }

    const sentinel = topSentinelRef.current;

    if (!sentinel) {
      return;
    }

    const viewport = sentinel.closest('[data-slot="scroll-area-viewport"]');

    if (!(viewport instanceof HTMLElement)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (
          !entry?.isIntersecting ||
          isBusy ||
          isLoadingMoreRef.current ||
          turnsStatus !== "CanLoadMore"
        ) {
          return;
        }

        isLoadingMoreRef.current = true;
        viewport.dataset.previousScrollHeight = String(viewport.scrollHeight);
        shouldStickToBottomRef.current = false;
        loadMore(TURNS_PAGE_SIZE);
      },
      {
        root: viewport,
        rootMargin: "64px 0px 0px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [chatId, isBusy, loadMore, turnsStatus]);

  const persistAssistantCompletion = useCallback(
    async (assistantMessage: PlanaChatMessage) => {
      const activeChatId = chatIdRef.current;

      if (!activeChatId || pendingTurnOrderRef.current === null) {
        return;
      }

      if (persistedAssistantIdsRef.current.has(assistantMessage.id)) {
        return;
      }

      persistedAssistantIdsRef.current.add(assistantMessage.id);

      await completeAssistantVariant({
        chatId: activeChatId,
        turnOrder: pendingTurnOrderRef.current,
        clientId: assistantMessage.id,
        parts: messageToParts(assistantMessage),
      });
    },
    [completeAssistantVariant],
  );

  useEffect(() => {
    if (status !== "ready" || isBusy || !chatIdRef.current) {
      return;
    }

    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (!latestAssistant) {
      return;
    }

    void persistAssistantCompletion(latestAssistant);
  }, [isBusy, messages, persistAssistantCompletion, status]);

  const prepareOutgoingUserMessage = useCallback((text: string) => {
    const userClientId = generateId();
    const userParts = [{ type: "text" as const, text }];

    return {
      id: userClientId,
      parts: userParts,
      role: "user" as const,
    };
  }, []);

  const persistOutgoingUserMessage = useCallback(
    async (userMessage: PlanaChatMessage) => {
      const userClientId = userMessage.id;
      const userParts = messageToParts(userMessage);
      let activeChatId = chatIdRef.current;

      if (!activeChatId) {
        activeChatId = await createChatWithTurn({
          userClientId,
          userParts,
        });
        chatIdRef.current = activeChatId;
        pendingTurnOrderRef.current = 0;
        turnOrderByUserClientIdRef.current[userClientId] = 0;
        hydratedChatIdRef.current = activeChatId;
        replaceChatUrl?.(activeChatId);
        notifyChatActivity?.(activeChatId);
        return;
      }

      notifyChatActivity?.(activeChatId);

      const turnOrder = await appendTurn({
        chatId: activeChatId,
        userClientId,
        userParts,
      });
      pendingTurnOrderRef.current = turnOrder;
      turnOrderByUserClientIdRef.current[userClientId] = turnOrder;
    },
    [
      appendTurn,
      createChatWithTurn,
      notifyChatActivity,
      replaceChatUrl,
    ],
  );

  const sendPersistedMessage = useCallback(
    async (text: string) => {
      const userMessage = prepareOutgoingUserMessage(text);
      await persistOutgoingUserMessage(userMessage);
      return userMessage;
    },
    [persistOutgoingUserMessage, prepareOutgoingUserMessage],
  );

  const persistBranchSwitch = useCallback(
    (parentUserMessageId: string, selectedVariantIndex: number) => {
      const activeChatId = chatIdRef.current;
      const turnOrder = turnOrderByUserClientIdRef.current[parentUserMessageId];

      if (!activeChatId || turnOrder === undefined) {
        return;
      }

      void selectVariant({
        chatId: activeChatId,
        turnOrder,
        selectedVariantIndex,
      });
    },
    [selectVariant],
  );

  const persistRewind = useCallback(
    async (assistantMessage: PlanaChatMessage) => {
      const activeChatId = chatIdRef.current;

      if (!activeChatId) {
        return;
      }

      const fromOrder = findTurnOrderForAssistantMessage(
        loadedTurnsRef.current,
        assistantMessage.id,
      );

      if (fromOrder === null) {
        return;
      }

      await rewindFromTurn({
        chatId: activeChatId,
        fromOrder,
      });

      loadedTurnsRef.current = loadedTurnsRef.current
        .filter((turn) => turn.order <= fromOrder)
        .map((turn) =>
          turn.order === fromOrder
            ? {
                ...turn,
                assistantVariants: turn.assistantVariants.slice(
                  0,
                  turn.selectedVariantIndex + 1,
                ),
              }
            : turn,
        );
      loadedTurnsSignatureRef.current = getTurnsSignature(
        loadedTurnsRef.current,
      );
    },
    [rewindFromTurn],
  );

  const prepareRegenerate = useCallback(
    (assistantMessage: PlanaChatMessage) => {
      const parentUserMessageId = findParentUserMessageId(
        messages,
        assistantMessage.id,
      );

      if (!parentUserMessageId) {
        return;
      }

      const turnOrder =
        turnOrderByUserClientIdRef.current[parentUserMessageId] ?? null;
      pendingTurnOrderRef.current = turnOrder;
    },
    [messages],
  );

  return {
    canLoadMoreHistory: turnsStatus === "CanLoadMore",
    isLoadingHistory: !!chatId && turnsStatus === "LoadingFirstPage",
    isLoadingMoreHistory: turnsStatus === "LoadingMore",
    markSendActive: () => {
      activeSendRef.current = true;
    },
    markSendInactive: () => {
      activeSendRef.current = false;
    },
    persistBranchSwitch,
    persistRewind,
    persistAssistantCompletion,
    prepareOutgoingUserMessage,
    prepareRegenerate,
    persistOutgoingUserMessage,
    scrollContainerRef,
    sendPersistedMessage,
    shouldStickToBottomRef,
    topSentinelRef,
  };
}
