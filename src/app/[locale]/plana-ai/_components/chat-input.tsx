"use client";

import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_TEXTAREA_HEIGHT = 200;

type ChatInputProps = {
  isBusy: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  onValueChange: (value: string) => void;
  value: string;
};

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput({ isBusy, onSend, onStop, onValueChange, value }, ref) {
    const t = useTranslations();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    useEffect(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    }, [
      value,
    ]);

    function sendCurrentMessage() {
      const message = value.trim();

      if (!message || isBusy) {
        return;
      }

      onSend(message);
    }

    return (
      <form
        className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm transition-shadow focus-within:border-ring/60 focus-within:shadow-md"
        onSubmit={(event) => {
          event.preventDefault();
          sendCurrentMessage();
        }}
      >
        <Textarea
          ref={textareaRef}
          className="max-h-[200px] min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isBusy) {
              onStop();
              return;
            }

            // Enter also confirms IME conversion, and on touch keyboards it's
            // the only way to add a new line.
            if (
              event.key !== "Enter" ||
              event.shiftKey ||
              event.nativeEvent.isComposing ||
              event.keyCode === 229 ||
              window.matchMedia("(pointer: coarse)").matches
            ) {
              return;
            }

            event.preventDefault();
            sendCurrentMessage();
          }}
          placeholder={t("tools.plana.input.placeholder")}
          rows={1}
          value={value}
        />
        {isBusy ? (
          <Button
            aria-label={t("tools.plana.input.stop")}
            className="size-9 shrink-0 rounded-full"
            onClick={onStop}
            size="icon"
            title={t("tools.plana.input.stop")}
            type="button"
            variant="secondary"
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        ) : (
          <Button
            aria-label={t("tools.plana.input.send")}
            className="size-9 shrink-0 rounded-full"
            disabled={!value.trim()}
            size="icon"
            title={t("tools.plana.input.send")}
            type="submit"
          >
            <ArrowUpIcon />
          </Button>
        )}
      </form>
    );
  },
);

ChatInput.displayName = "ChatInput";
