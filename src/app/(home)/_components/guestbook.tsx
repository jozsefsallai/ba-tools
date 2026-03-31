"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GUESTBOOK_MESSAGE_MAX,
  getOrCreateGuestbookToken,
} from "@/lib/guestbook";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";

export function Guestbook() {
  const t = useTranslations();
  const entries = useQuery(api.guestbook.list);
  const submit = useMutation(api.guestbook.submit);

  const [token, setToken] = useState<string | null>(null);
  const ownEntry = useQuery(
    api.guestbook.getByToken,
    token ? { token } : "skip",
  );

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setToken(getOrCreateGuestbookToken());
  }, []);

  function setMessageClamped(next: string) {
    setMessage(next.slice(0, GUESTBOOK_MESSAGE_MAX));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedMessage) {
      toast.error(t("static.home.guestbook.validation"));
      return;
    }

    if (trimmedMessage.length > GUESTBOOK_MESSAGE_MAX) {
      toast.error(t("static.home.guestbook.tooLong"));
      return;
    }

    setPending(true);
    try {
      await submit({
        name: trimmedName,
        message: trimmedMessage,
        submitterToken: token,
      });
      setName("");
      setMessage("");
      toast.success(t("static.home.guestbook.success"));
    } catch (err) {
      if (err instanceof ConvexError) {
        if (err.data === "ALREADY_SIGNED") {
          toast.error(t("static.home.guestbook.alreadySigned"));
        } else if (err.data === "VALIDATION" || err.data === "INVALID_TOKEN") {
          toast.error(t("static.home.guestbook.validation"));
        } else {
          toast.error(t("static.home.guestbook.error"));
        }
      } else {
        toast.error(t("static.home.guestbook.error"));
      }
    } finally {
      setPending(false);
    }
  }

  const alreadyPosted = ownEntry !== undefined && ownEntry !== null;
  const waitingForToken = token === null;
  const waitingForOwn = ownEntry === undefined && token !== null;

  return (
    <div className="flex flex-col gap-4 border-4 border-[#00ffff] bg-[#ffffee] dark:bg-[#002222] p-4 shadow-md">
      {waitingForToken || waitingForOwn ? (
        <p className="comic-sans text-[#666600] dark:text-[#aaaa00] animate-pulse">
          {t("static.home.guestbook.loading")}
        </p>
      ) : alreadyPosted ? (
        <div className="border-4 border-[#ff00ff] bg-[#ffffcc] dark:bg-[#330033] p-4 comic-sans font-bold text-center text-[#990099] dark:text-[#ff99ff]">
          {t("static.home.guestbook.alreadySignedBlurb", {
            name: ownEntry.name,
          })}
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label
              htmlFor="gb-name"
              className="comic-sans font-bold text-[#990099]"
            >
              {t("static.home.guestbook.nameLabel")}
            </Label>
            <Input
              id="gb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("static.home.guestbook.namePlaceholder")}
              maxLength={48}
              autoComplete="nickname"
              className="border-2 border-[#ff00ff] comic-sans bg-white dark:bg-[#1a1a2e]"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between gap-2 items-baseline">
              <Label
                htmlFor="gb-msg"
                className="comic-sans font-bold text-[#cc6600]"
              >
                {t("static.home.guestbook.messageLabel")}
              </Label>
              <span className="text-xs comic-sans text-[#666600] dark:text-[#aaaa00] tabular-nums">
                {message.length}/{GUESTBOOK_MESSAGE_MAX}
              </span>
            </div>
            <Textarea
              id="gb-msg"
              value={message}
              onChange={(e) => setMessageClamped(e.target.value)}
              placeholder={t("static.home.guestbook.messagePlaceholder")}
              maxLength={GUESTBOOK_MESSAGE_MAX}
              rows={4}
              className="border-2 border-[#00ff00] comic-sans resize-y bg-white dark:bg-[#1a1a2e]"
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="comic-sans font-bold border-4 border-[#ffff00]"
          >
            {pending
              ? t("static.home.guestbook.submitting")
              : t("static.home.guestbook.submit")}
          </Button>
        </form>
      )}

      <ul className="flex flex-col gap-3 max-h-[28rem] overflow-y-auto pr-1">
        {entries === undefined && (
          <li className="comic-sans text-[#666600] dark:text-[#aaaa00] animate-pulse">
            {t("static.home.guestbook.loading")}
          </li>
        )}
        {entries?.length === 0 && (
          <li className="comic-sans text-[#666600] dark:text-[#aaaa00] italic">
            {t("static.home.guestbook.empty")}
          </li>
        )}
        {entries?.map((entry) => (
          <li
            key={entry._id}
            className="border-2 border-dashed border-[#ff6600] bg-[#fff8dc] dark:bg-[#331100] p-3"
          >
            <div className="font-heading font-bold text-[#000080] dark:text-[#00ffff]">
              {entry.name}
            </div>
            <p className="comic-sans text-sm whitespace-pre-wrap break-words text-[#333300] dark:text-[#ccffcc]">
              {entry.message}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
