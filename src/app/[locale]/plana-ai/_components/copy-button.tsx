"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const COPIED_RESET_MS = 1500;

export function CopyButton({ text }: { text: string }) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return (
    <Button
      aria-label={
        copied ? t("tools.plana.message.copied") : t("tools.plana.message.copy")
      }
      className="text-muted-foreground"
      onClick={() => void handleCopy()}
      size="icon-xs"
      title={t("tools.plana.message.copy")}
      type="button"
      variant="ghost"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}
