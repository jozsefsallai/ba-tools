"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  RefreshCwIcon,
  RewindIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useState } from "react";
import { CopyButton } from "@/app/[locale]/plana-ai/_components/copy-button";
import { PlanaChatAvatar } from "@/app/[locale]/plana-ai/_components/plana-chat-avatar";
import { PlanaMarkdown } from "@/app/[locale]/plana-ai/_components/plana-markdown";
import { ToolActivity } from "@/app/[locale]/plana-ai/_components/tool-activity";
import { ToolApprovalCard } from "@/app/[locale]/plana-ai/_components/tool-approval-card";
import type { PlanaChatMessage } from "@/app/[locale]/plana-ai/_lib/chat-persistence";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { isPlanaToolPart, toolPartToView } from "@/lib/ai/tool-parts";
import { cn } from "@/lib/utils";
import { getVisibleAssistantText, stripPlanaMetadata } from "./message-utils";

export type ChatMessageActions = {
  edit: (message: PlanaChatMessage, text: string) => void;
  regenerate: (message: PlanaChatMessage) => void;
  respondToApproval: (approvalId: string, approved: boolean) => void;
  rewind: (message: PlanaChatMessage) => void;
  switchBranch: (message: PlanaChatMessage, delta: -1 | 1) => void;
};

const ACTION_ROW_CLASS =
  "flex items-center gap-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100";

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="text-muted-foreground"
      onClick={onClick}
      size="icon-xs"
      title={label}
      type="button"
      variant="ghost"
    >
      {icon}
    </Button>
  );
}

function ReasoningRow({
  isStreaming,
  text,
}: {
  isStreaming: boolean;
  text: string;
}) {
  const t = useTranslations();

  return (
    <Collapsible>
      <CollapsibleTrigger className="group/reasoning flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground">
        <ChevronRightIcon className="size-3.5 transition-transform group-data-[state=open]/reasoning:rotate-90" />

        <span className={cn(isStreaming && "animate-pulse")}>
          {isStreaming
            ? t("tools.plana.message.thinking")
            : t("tools.plana.message.thought")}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <p className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap border-l-2 pl-3 text-muted-foreground text-xs">
          {text}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function UserMessage({
  actions,
  canEdit,
  message,
}: {
  actions: ChatMessageActions;
  canEdit: boolean;
  message: PlanaChatMessage;
}) {
  const t = useTranslations();

  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  if (isEditing) {
    return (
      <div className="ml-auto w-full space-y-2 rounded-2xl border bg-card p-3">
        <Textarea
          autoFocus
          className="max-h-60 min-h-16 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
          onChange={(event) => setDraft(event.target.value)}
          value={draft}
        />

        <p className="px-1 text-muted-foreground text-xs">
          {t("tools.plana.message.editNotice")}
        </p>

        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              setDraft(text);
              setIsEditing(false);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("tools.plana.message.editCancel")}
          </Button>

          <Button
            disabled={!draft.trim()}
            onClick={() => {
              setIsEditing(false);
              actions.edit(message, draft.trim());
            }}
            size="sm"
            type="button"
          >
            {t("tools.plana.message.editSave")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/row flex flex-col items-end gap-1">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed">
        {text}
      </div>

      <div className={ACTION_ROW_CLASS}>
        <CopyButton text={text} />

        {canEdit ? (
          <ActionButton
            icon={<PencilIcon />}
            label={t("tools.plana.message.edit")}
            onClick={() => {
              setDraft(text);
              setIsEditing(true);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function AssistantMessage({
  actions,
  branchCount,
  branchIndex,
  canRegenerate,
  canRewind,
  isStreaming,
  message,
}: {
  actions: ChatMessageActions;
  branchCount: number;
  branchIndex: number;
  canRegenerate: boolean;
  canRewind: boolean;
  isStreaming: boolean;
  message: PlanaChatMessage;
}) {
  const t = useTranslations();

  const hasContent = message.parts.some(
    (part) =>
      isPlanaToolPart(part) ||
      part.type === "data-savedTool" ||
      (part.type === "reasoning" && part.text.trim()) ||
      (part.type === "text" && stripPlanaMetadata(part.text).trim()),
  );

  if (!hasContent) {
    return null;
  }

  const visibleText = getVisibleAssistantText(message);

  return (
    <div className="group/row flex w-full gap-3">
      <PlanaChatAvatar className="mt-0.5" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {message.parts.map((part, index) => {
          const key = `${message.id}-${index}`;

          if (part.type === "text") {
            const text = stripPlanaMetadata(part.text);

            return text.trim() ? <PlanaMarkdown key={key} text={text} /> : null;
          }

          if (part.type === "reasoning") {
            return part.text.trim() ? (
              <ReasoningRow
                isStreaming={part.state === "streaming"}
                key={key}
                text={part.text}
              />
            ) : null;
          }

          if (part.type === "data-savedTool") {
            return <ToolActivity key={key} tool={part.data} />;
          }

          if (isPlanaToolPart(part)) {
            const view = toolPartToView(part);

            return view.status === "approval" ? (
              <ToolApprovalCard
                key={key}
                onRespond={actions.respondToApproval}
                tool={view}
              />
            ) : (
              <ToolActivity key={key} tool={view} />
            );
          }

          return null;
        })}

        {isStreaming ? null : (
          <div className={ACTION_ROW_CLASS}>
            {branchCount > 1 ? (
              <div className="flex items-center">
                <ActionButton
                  icon={<ChevronLeftIcon />}
                  label={t("tools.plana.branches.previous")}
                  onClick={() => actions.switchBranch(message, -1)}
                />
                <span className="min-w-8 text-center text-xs tabular-nums">
                  {t("tools.plana.branches.indicator", {
                    current: branchIndex + 1,
                    total: branchCount,
                  })}
                </span>
                <ActionButton
                  icon={<ChevronRightIcon />}
                  label={t("tools.plana.branches.next")}
                  onClick={() => actions.switchBranch(message, 1)}
                />
              </div>
            ) : null}

            {visibleText ? <CopyButton text={visibleText} /> : null}

            {canRegenerate ? (
              <ActionButton
                icon={<RefreshCwIcon />}
                label={t("tools.plana.input.regenerate")}
                onClick={() => actions.regenerate(message)}
              />
            ) : null}

            {canRewind ? (
              <ActionButton
                icon={<RewindIcon />}
                label={t("tools.plana.message.rewind")}
                onClick={() => actions.rewind(message)}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({
  actions,
  branchCount = 0,
  branchIndex = 0,
  canEdit = false,
  canRegenerate = false,
  canRewind = false,
  isStreaming = false,
  message,
}: {
  actions: ChatMessageActions;
  branchCount?: number;
  branchIndex?: number;
  canEdit?: boolean;
  canRegenerate?: boolean;
  canRewind?: boolean;
  isStreaming?: boolean;
  message: PlanaChatMessage;
}) {
  return message.role === "user" ? (
    <UserMessage actions={actions} canEdit={canEdit} message={message} />
  ) : (
    <AssistantMessage
      actions={actions}
      branchCount={branchCount}
      branchIndex={branchIndex}
      canRegenerate={canRegenerate}
      canRewind={canRewind}
      isStreaming={isStreaming}
      message={message}
    />
  );
});

export function ChatPendingIndicator({ label }: { label?: string }) {
  const t = useTranslations();

  return (
    <div className="flex w-full items-center gap-3">
      <PlanaChatAvatar />
      {label ? (
        <span className="animate-pulse text-muted-foreground text-sm">
          {label}
        </span>
      ) : (
        <span
          aria-label={t("tools.plana.message.working")}
          className="flex items-center gap-1 text-muted-foreground"
          role="status"
        >
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-current" />
        </span>
      )}
    </div>
  );
}
