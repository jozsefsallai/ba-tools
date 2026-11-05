"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  findParentUserMessageId,
  type PlanaBranches,
  type PlanaChatMessage,
} from "@/app/[locale]/plana-ai/_lib/chat-persistence";

export function usePlanaBranches({
  setMessages,
}: {
  setMessages: Dispatch<SetStateAction<PlanaChatMessage[]>>;
}) {
  const branchesRef = useRef<PlanaBranches>({});
  const [, rerender] = useState(0);

  const bumpBranches = useCallback(() => {
    rerender((version) => version + 1);
  }, []);

  const resetBranches = useCallback(() => {
    branchesRef.current = {};
    bumpBranches();
  }, [
    bumpBranches,
  ]);

  const trackSibling = useCallback(
    (parentUserMessageId: string, assistantMessage: PlanaChatMessage) => {
      const branch = branchesRef.current[parentUserMessageId] ?? {
        activeIndex: 0,
        siblings: [],
      };

      const existingIndex = branch.siblings.findIndex(
        (message) => message.id === assistantMessage.id,
      );

      branch.siblings =
        existingIndex === -1
          ? [
              ...branch.siblings,
              assistantMessage,
            ]
          : branch.siblings.map((message, index) =>
              index === existingIndex ? assistantMessage : message,
            );

      branch.activeIndex =
        existingIndex === -1 ? branch.siblings.length - 1 : existingIndex;
      branchesRef.current[parentUserMessageId] = branch;

      bumpBranches();
    },
    [
      bumpBranches,
    ],
  );

  const switchBranch = useCallback(
    (
      messages: PlanaChatMessage[],
      assistantMessage: PlanaChatMessage,
      delta: -1 | 1,
    ) => {
      const parentUserMessageId = findParentUserMessageId(
        messages,
        assistantMessage.id,
      );

      const branch = parentUserMessageId
        ? branchesRef.current[parentUserMessageId]
        : undefined;

      if (!parentUserMessageId || !branch) {
        return null;
      }

      const nextIndex = branch.activeIndex + delta;
      const nextMessage = branch.siblings[nextIndex];

      if (!nextMessage) {
        return null;
      }

      branch.activeIndex = nextIndex;

      setMessages(
        messages.map((message) =>
          message.id === assistantMessage.id ? nextMessage : message,
        ),
      );

      bumpBranches();

      return {
        parentUserMessageId,
        selectedVariantIndex: nextIndex,
      };
    },
    [
      bumpBranches,
      setMessages,
    ],
  );

  const trimBranches = useCallback(
    (remaining: PlanaChatMessage[], keptAssistant?: PlanaChatMessage) => {
      const remainingIds = new Set(remaining.map((message) => message.id));

      branchesRef.current = Object.fromEntries(
        Object.entries(branchesRef.current).filter(([userMessageId]) =>
          remainingIds.has(userMessageId),
        ),
      );

      if (keptAssistant) {
        const parentId = findParentUserMessageId(remaining, keptAssistant.id);
        const branch = parentId ? branchesRef.current[parentId] : undefined;
        const index =
          branch?.siblings.findIndex(
            (message) => message.id === keptAssistant.id,
          ) ?? -1;

        if (branch && index !== -1) {
          branch.siblings = branch.siblings.slice(0, index + 1);
          branch.activeIndex = index;
        }
      }

      bumpBranches();
    },
    [
      bumpBranches,
    ],
  );

  return {
    branchesRef,
    bumpBranches,
    resetBranches,
    switchBranch,
    trackSibling,
    trimBranches,
  };
}
