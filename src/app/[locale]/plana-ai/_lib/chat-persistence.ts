import type { PlanaChatMessage } from "@/lib/ai/message-types";
import type { Doc } from "~convex/dataModel";

export type { PlanaChatMessage };

export type PlanaBranch = {
  activeIndex: number;
  siblings: PlanaChatMessage[];
};

export type PlanaBranches = Record<string, PlanaBranch>;

export type PlanaMessagePart = {
  type: "text";
  text: string;
};

export type PlanaTurnDoc = Doc<"planaTurn">;

export function messageToParts(message: PlanaChatMessage): PlanaMessagePart[] {
  return message.parts
    .filter(
      (
        part,
      ): part is {
        type: "text";
        text: string;
      } => part.type === "text",
    )
    .map((part) => ({
      type: "text" as const,
      text: part.text,
    }));
}

export function findParentUserMessageId(
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

function variantToMessage(
  variant: PlanaTurnDoc["assistantVariants"][number],
): PlanaChatMessage {
  return {
    id: variant.clientId,
    role: "assistant",
    parts: variant.parts.map((part) =>
      part.type === "text"
        ? part
        : {
            type: "data-savedTool" as const,
            data: {
              toolName: part.toolName,
              status: part.status,
              summary: part.summary,
              students: part.students,
              link: part.link,
            },
          },
    ),
  };
}

export function turnsToMessagesAndBranches(turns: PlanaTurnDoc[]): {
  branches: PlanaBranches;
  messages: PlanaChatMessage[];
  turnOrderByUserClientId: Record<string, number>;
} {
  const sortedTurns = [
    ...turns,
  ].sort((left, right) => left.order - right.order);
  const messages: PlanaChatMessage[] = [];
  const branches: PlanaBranches = {};
  const turnOrderByUserClientId: Record<string, number> = {};

  for (const turn of sortedTurns) {
    turnOrderByUserClientId[turn.userClientId] = turn.order;

    messages.push({
      id: turn.userClientId,
      role: "user",
      parts: turn.userParts,
    });

    if (turn.assistantVariants.length === 0) {
      continue;
    }

    const selectedVariant =
      turn.assistantVariants[turn.selectedVariantIndex] ??
      turn.assistantVariants[0];

    messages.push(variantToMessage(selectedVariant));

    if (turn.assistantVariants.length > 1) {
      branches[turn.userClientId] = {
        activeIndex: turn.selectedVariantIndex,
        siblings: turn.assistantVariants.map(variantToMessage),
      };
    }
  }

  return {
    branches,
    messages,
    turnOrderByUserClientId,
  };
}

export function mergeTurnPages(
  existingTurns: PlanaTurnDoc[],
  newPage: PlanaTurnDoc[],
) {
  const byId = new Map<string, PlanaTurnDoc>();

  for (const turn of [
    ...existingTurns,
    ...newPage,
  ]) {
    byId.set(turn._id, turn);
  }

  return [
    ...byId.values(),
  ].sort((left, right) => left.order - right.order);
}

export function toWireMessages(messages: PlanaChatMessage[]) {
  return messages.map((message, index) => {
    const isContinuation =
      index === messages.length - 1 && message.role === "assistant";

    return {
      ...message,
      parts: message.parts.filter(
        (part) =>
          part.type === "text" ||
          (isContinuation &&
            part.type !== "reasoning" &&
            !part.type.startsWith("data-")),
      ),
    };
  });
}

export function getLatestUserMessageId(messages: PlanaChatMessage[]) {
  return messages.findLast((message) => message.role === "user")?.id;
}
