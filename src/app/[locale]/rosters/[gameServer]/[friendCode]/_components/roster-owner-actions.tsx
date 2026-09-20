"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueryWithStatus } from "@/lib/convex";
import type { GameServer } from "@/lib/types";
import { useAuth } from "@clerk/nextjs";
import { CheckIcon, ImageIcon, LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";

type RosterOwnerActionsProps = {
  gameServer: GameServer;
  friendCode: string;
  lastUpdated: number;
  visibility: "private" | "public";
};

export function RosterOwnerActions({
  gameServer,
  friendCode,
  lastUpdated,
  visibility,
}: RosterOwnerActionsProps) {
  const t = useTranslations();
  const { isSignedIn } = useAuth();

  const ownRostersQuery = useQueryWithStatus(
    api.roster.getOwn,
    isSignedIn ? {} : "skip",
  );

  const isOwnRoster = useMemo(() => {
    if (ownRostersQuery.status !== "success") {
      return false;
    }

    return ownRostersQuery.data.some(
      (roster) =>
        roster.gameServer === gameServer && roster.friendCode === friendCode,
    );
  }, [ownRostersQuery.status, ownRostersQuery.data, gameServer, friendCode]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const publicRosterPath = `/rosters/${gameServer}/${friendCode}`;
  const canCopyImage = visibility === "public";

  const handleCopyLink = useCallback(async () => {
    if (copiedLink) {
      return;
    }

    try {
      const url = new URL(publicRosterPath, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success(t("tools.roster.editor.toasts.shareLinkCopied"));
    } catch (err) {
      console.error(err);
      toast.error(t("tools.roster.editor.toasts.shareLinkCopyFailed"));
    } finally {
      setTimeout(() => {
        setCopiedLink(false);
      }, 3000);
    }
  }, [copiedLink, publicRosterPath, t]);

  const handleCopyImage = useCallback(async () => {
    if (copiedImage || !canCopyImage) {
      return;
    }

    setCopiedImage(true);

    try {
      const ogImageUrl = `${publicRosterPath}/opengraph-image?v=${lastUpdated}`;
      const response = await fetch(ogImageUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch OG image");
      }

      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      toast.success(t("tools.roster.view.toasts.imageCardCopied"));
    } catch (err) {
      console.error(err);
      toast.error(t("tools.roster.view.toasts.imageCardCopyFailed"));
    } finally {
      setTimeout(() => {
        setCopiedImage(false);
      }, 3000);
    }
  }, [canCopyImage, copiedImage, lastUpdated, publicRosterPath, t]);

  if (!isOwnRoster) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex shrink-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
              disabled={copiedLink}
            >
              {copiedLink ? <CheckIcon /> : <LinkIcon />}
              <span className="sr-only">
                {t("tools.roster.view.copyShareLink")}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {copiedLink
              ? t("tools.roster.editor.shareLinkCopied")
              : t("tools.roster.view.copyShareLink")}
          </TooltipContent>
        </Tooltip>

        {canCopyImage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyImage}
                disabled={copiedImage}
              >
                {copiedImage ? <CheckIcon /> : <ImageIcon />}
                <span className="sr-only">
                  {t("tools.roster.view.copyImageCard")}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {copiedImage
                ? t("tools.roster.view.imageCardCopied")
                : t("tools.roster.view.copyImageCard")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
