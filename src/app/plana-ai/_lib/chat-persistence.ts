import type { UIMessage } from "ai";
import type { Doc } from "~convex/dataModel";

export type PlanaChatMessage = UIMessage<unknown, Record<string, never>>;

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

export function getTextFromParts(parts: PlanaMessagePart[]) {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function messageToParts(message: PlanaChatMessage): PlanaMessagePart[] {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
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

export function findTurnOrderForAssistantMessage(
  turns: PlanaTurnDoc[],
  assistantMessageId: string,
) {
  for (const turn of turns) {
    const variantIndex = turn.assistantVariants.findIndex(
      (variant) => variant.clientId === assistantMessageId,
    );

    if (variantIndex !== -1) {
      return turn.order;
    }
  }

  return null;
}

export function turnsToMessagesAndBranches(turns: PlanaTurnDoc[]): {
  branches: PlanaBranches;
  messages: PlanaChatMessage[];
  turnOrderByUserClientId: Record<string, number>;
} {
  const sortedTurns = [...turns].sort(
    (left, right) => left.order - right.order,
  );
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

    messages.push({
      id: selectedVariant.clientId,
      role: "assistant",
      parts: selectedVariant.parts,
    });

    if (turn.assistantVariants.length > 1) {
      branches[turn.userClientId] = {
        activeIndex: turn.selectedVariantIndex,
        siblings: turn.assistantVariants.map((variant) => ({
          id: variant.clientId,
          role: "assistant",
          parts: variant.parts,
        })),
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

  for (const turn of [...existingTurns, ...newPage]) {
    byId.set(turn._id, turn);
  }

  return [...byId.values()].sort((left, right) => left.order - right.order);
}
