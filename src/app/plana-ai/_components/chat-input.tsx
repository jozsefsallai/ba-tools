"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatStatus } from "ai";
import { SendIcon, SquareIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type ChatInputProps = {
  onClear: () => void;
  onSend: (message: string) => void;
  onStop: () => void;
  onValueChange?: (value: string) => void;
  status: ChatStatus;
  value?: string;
};

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    { onClear, onSend, onStop, onValueChange, status, value },
    ref,
  ) {
    const t = useTranslations();
    const [internalInput, setInternalInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const input = value ?? internalInput;
    const isBusy = status === "submitted" || status === "streaming";

    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    useEffect(() => {
      resizeTextarea();
    });

    function resizeTextarea() {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }

    function setInput(value: string) {
      onValueChange?.(value);
      setInternalInput(value);
    }

    function sendCurrentMessage() {
      const message = input.trim();

      if (!message || isBusy) {
        return;
      }

      onSend(message);
      setInput("");

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      });
    }

    return (
      <form
        className="rounded-3xl border bg-background/95 p-2 shadow-lg backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault();
          sendCurrentMessage();
        }}
      >
        <Textarea
          ref={textareaRef}
          className="max-h-[180px] min-h-12 resize-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0"
          disabled={isBusy}
          onChange={(event) => {
            setInput(event.target.value);
            resizeTextarea();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendCurrentMessage();
            }
          }}
          placeholder={t("tools.plana.input.placeholder")}
          rows={1}
          value={input}
        />
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <div className="flex items-center gap-1">
            <Button
              aria-label={t("tools.plana.input.newChat")}
              disabled={isBusy}
              onClick={onClear}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Trash2Icon />
            </Button>
          </div>

          {isBusy ? (
            <Button
              onClick={onStop}
              size="sm"
              type="button"
              variant="secondary"
            >
              <SquareIcon className="size-3 fill-current" />
              {t("tools.plana.input.stop")}
            </Button>
          ) : (
            <Button
              className={cn(!input.trim() && "opacity-60")}
              disabled={!input.trim()}
              size="sm"
              type="submit"
            >
              <SendIcon />
              {t("tools.plana.input.send")}
            </Button>
          )}
        </div>
      </form>
    );
  },
);

ChatInput.displayName = "ChatInput";
