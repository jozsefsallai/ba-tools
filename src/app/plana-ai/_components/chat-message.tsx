"use client";

import planaIcon from "@/assets/plana-icon.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { stripPlanaMetadata } from "./message-utils";

type PlanaChatMessage = UIMessage<unknown, Record<string, never>>;

function getTextParts(message: UIMessage) {
  return message.parts.filter((part) => part.type === "text");
}

export function ChatMessage({
  branches,
  isStreaming,
  message,
  onRegenerate,
  onRewind,
  onSwitchBranch,
}: {
  branches?: {
    activeIndex: number;
    count: number;
  };
  isStreaming: boolean;
  message: PlanaChatMessage;
  onRegenerate?: (message: PlanaChatMessage) => void;
  onRewind?: (message: PlanaChatMessage) => void;
  onSwitchBranch?: (delta: -1 | 1) => void;
}) {
  const t = useTranslations();
  const isUser = message.role === "user";
  const canSwitchBranches = !isUser && branches && branches.count > 1;
  const canShowAssistantActions = !isUser && !isStreaming;
  const textParts = getTextParts(message)
    .map((part) => ({
      ...part,
      text: isUser ? part.text : stripPlanaMetadata(part.text),
    }))
    .filter((part) => part.text.trim().length > 0);

  if (textParts.length === 0 && !isStreaming) {
    return null;
  }

  return (
    <div
      className={cn("group/row flex w-full gap-3", {
        "justify-end": isUser,
      })}
    >
      {!isUser && (
        <Avatar className="mt-1 size-8 border bg-background">
          <Image
            alt="Plana"
            className="size-full object-cover"
            placeholder="blur"
            src={planaIcon}
          />
          <AvatarFallback className="text-xs">P</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "relative max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm md:max-w-[70%]",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border bg-card text-card-foreground",
        )}
      >
        {textParts.map((part, index) => (
          <ReactMarkdown
            key={`${message.id}-${index}`}
            components={{
              code: ({ children }) => (
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                  {children}
                </code>
              ),
              em: ({ children }) => (
                <em className="text-muted-foreground">{children}</em>
              ),
              li: ({ children }) => (
                <li className="ml-4 list-disc">{children}</li>
              ),
              ol: ({ children }) => (
                <ol className="my-2 space-y-1">{children}</ol>
              ),
              p: ({ children }) => (
                <p className="whitespace-pre-wrap">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="my-2 space-y-1">{children}</ul>
              ),
            }}
          >
            {part.text}
          </ReactMarkdown>
        ))}
        {isStreaming && textParts.length === 0 && (
          <span className="flex items-center gap-1 py-1">
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current" />
          </span>
        )}
        {canShowAssistantActions && canSwitchBranches && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Button
                aria-label={t("tools.plana.branches.previous")}
                disabled={branches.activeIndex <= 0}
                onClick={() => onSwitchBranch?.(-1)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <ChevronLeftIcon />
              </Button>
              <span className="min-w-10 text-center text-xs">
                {t("tools.plana.branches.indicator", {
                  current: branches.activeIndex + 1,
                  total: branches.count,
                })}
              </span>
              <Button
                aria-label={t("tools.plana.branches.next")}
                disabled={branches.activeIndex >= branches.count - 1}
                onClick={() => onSwitchBranch?.(1)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        )}
      </div>
      {canShowAssistantActions && (onRegenerate || onRewind) && (
        <div className="mt-1 flex shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
          {onRegenerate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={t("tools.plana.input.regenerate")}
                  className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => onRegenerate(message)}
                  size="icon-sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCwIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("tools.plana.input.regenerate")}
              </TooltipContent>
            </Tooltip>
          )}
          {onRewind && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={t("tools.plana.message.rewind")}
                  className="border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => onRewind(message)}
                  size="icon-sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCcwIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("tools.plana.message.rewind")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
