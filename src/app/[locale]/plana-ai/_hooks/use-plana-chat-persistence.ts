"use client";

import { generateId } from "ai";
import { useMutation, usePaginatedQuery } from "convex/react";
import {
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  mergeTurnPages,
  messageToParts,
  type PlanaBranches,
  type PlanaChatMessage,
  type PlanaTurnDoc,
  turnsToMessagesAndBranches,
} from "@/app/[locale]/plana-ai/_lib/chat-persistence";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const TURNS_PAGE_SIZE = 30;

type UsePlanaChatPersistenceOptions = {
  branchesRef: MutableRefObject<PlanaBranches>;
  bumpBranches: () => void;
  chatId?: Id<"planaChat">;
  isBusy: boolean;
  replaceChatUrl?: (chatId?: Id<"planaChat">) => void;
  notifyChatActivity?: (chatId: Id<"planaChat">) => void;
  scrollToBottom: () => void;
  setMessages: Dispatch<SetStateAction<PlanaChatMessage[]>>;
  viewportRef: RefObject<HTMLElement | null>;
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
  replaceChatUrl,
  notifyChatActivity,
  scrollToBottom,
  setMessages,
  viewportRef,
}: UsePlanaChatPersistenceOptions) {
  const chatIdRef = useRef<Id<"planaChat"> | undefined>(chatId);
  const bumpBranchesRef = useRef(bumpBranches);
  const turnOrderByUserClientIdRef = useRef<Record<string, number>>({});
  const loadedTurnsRef = useRef<PlanaTurnDoc[]>([]);
  const hydratedChatIdRef = useRef<Id<"planaChat"> | null>(null);
  const loadedTurnsSignatureRef = useRef("");
  const loadingMoreHistoryRef = useRef(false);
  const activeSendRef = useRef(false);
  const scrollToBottomRef = useRef(scrollToBottom);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  const appendTurn = useMutation(api.planaChat.appendTurn);
  const editTurn = useMutation(api.planaChat.editTurn);
  const createChatWithTurn = useMutation(api.planaChat.createChatWithTurn);
  const rewindFromTurn = useMutation(api.planaChat.rewindFromTurn);
  const selectVariant = useMutation(api.planaChat.selectVariant);

  const {
    loadMore,
    results: turnPages,
    status: turnsStatus,
  } = usePaginatedQuery(
    api.planaChat.getTurnsPaginated,
    chatId
      ? {
          chatId,
        }
      : "skip",
    {
      initialNumItems: TURNS_PAGE_SIZE,
    },
  );

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [
    chatId,
  ]);

  useEffect(() => {
    bumpBranchesRef.current = bumpBranches;
    scrollToBottomRef.current = scrollToBottom;
  }, [
    bumpBranches,
    scrollToBottom,
  ]);

  useEffect(() => {
    if (!chatId) {
      hydratedChatIdRef.current = null;
      loadedTurnsRef.current = [];
      loadedTurnsSignatureRef.current = "";
      turnOrderByUserClientIdRef.current = {};
      return;
    }

    if (hydratedChatIdRef.current !== chatId) {
      hydratedChatIdRef.current = null;
      loadedTurnsRef.current = [];
      loadedTurnsSignatureRef.current = "";
      turnOrderByUserClientIdRef.current = {};
    }
  }, [
    chatId,
  ]);

  useEffect(() => {
    if (turnsStatus === "LoadingMore") {
      loadingMoreHistoryRef.current = true;
      isLoadingMoreRef.current = true;
    }

    if (turnsStatus !== "LoadingMore") {
      isLoadingMoreRef.current = false;
    }
  }, [
    turnsStatus,
  ]);

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

    turnOrderByUserClientIdRef.current = turnOrderByUserClientId;
    branchesRef.current = branches;
    bumpBranchesRef.current();
    setMessages(hydratedMessages);
    hydratedChatIdRef.current = chatId;

    if (isPrepend) {
      requestAnimationFrame(() => {
        const viewport = viewportRef.current;
        const previousScrollHeight = viewport?.dataset.previousScrollHeight;

        if (viewport && previousScrollHeight) {
          viewport.scrollTop +=
            viewport.scrollHeight - Number.parseInt(previousScrollHeight, 10);
          delete viewport.dataset.previousScrollHeight;
        }
      });
      return;
    }

    if (isInitialHydration) {
      requestAnimationFrame(() => {
        scrollToBottomRef.current();
      });
    }
  }, [
    branchesRef,
    chatId,
    isBusy,
    setMessages,
    turnPages,
    turnsStatus,
    viewportRef,
  ]);

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

    const viewport = viewportRef.current;

    if (!viewport) {
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
  }, [
    chatId,
    isBusy,
    loadMore,
    turnsStatus,
    viewportRef,
  ]);

  const prepareOutgoingUserMessage = useCallback((text: string) => {
    const userClientId = generateId();
    const userParts = [
      {
        type: "text" as const,
        text,
      },
    ];

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
      turnOrderByUserClientIdRef.current[userClientId] = turnOrder;
    },
    [
      appendTurn,
      createChatWithTurn,
      notifyChatActivity,
      replaceChatUrl,
    ],
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
    [
      selectVariant,
    ],
  );

  const persistRewind = useCallback(
    async (parentUserMessageId: string) => {
      const activeChatId = chatIdRef.current;
      const fromOrder = turnOrderByUserClientIdRef.current[parentUserMessageId];

      if (!activeChatId || fromOrder === undefined) {
        return;
      }

      await rewindFromTurn({
        chatId: activeChatId,
        fromOrder,
      });
    },
    [
      rewindFromTurn,
    ],
  );

  const persistEdit = useCallback(
    async (userMessage: PlanaChatMessage) => {
      const activeChatId = chatIdRef.current;
      const order = turnOrderByUserClientIdRef.current[userMessage.id];

      if (!activeChatId || order === undefined) {
        return;
      }

      notifyChatActivity?.(activeChatId);

      await editTurn({
        chatId: activeChatId,
        order,
        userParts: messageToParts(userMessage),
      });
    },
    [
      editTurn,
      notifyChatActivity,
    ],
  );

  const getTurnOrder = useCallback((userMessageId: string | undefined) => {
    return userMessageId
      ? turnOrderByUserClientIdRef.current[userMessageId]
      : undefined;
  }, []);

  const getActiveChatId = useCallback(() => chatIdRef.current, []);

  return {
    getActiveChatId,
    getTurnOrder,
    isLoadingHistory:
      !!chatId &&
      turnsStatus === "LoadingFirstPage" &&
      hydratedChatIdRef.current !== chatId,
    isLoadingMoreHistory: turnsStatus === "LoadingMore",
    markSendActive: () => {
      activeSendRef.current = true;
    },
    markSendInactive: () => {
      activeSendRef.current = false;
    },
    persistBranchSwitch,
    persistEdit,
    persistRewind,
    prepareOutgoingUserMessage,
    persistOutgoingUserMessage,
    topSentinelRef,
  };
}
