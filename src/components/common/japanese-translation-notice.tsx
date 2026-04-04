"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "jp-translation-notice-dismissed";

export function JapaneseTranslationNotice() {
  const [isDismissed, setIsDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setIsDismissed(stored === "true");
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setIsDismissed(true);
  };

  if (!mounted || isDismissed) {
    return null;
  }

  return (
    <section
      aria-label="Japanese translation notice"
      className="bg-yellow-500/10 text-yellow-500/80 border border-yellow-500/20 rounded-md mt-12"
    >
      <div className="container px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0 text-sm space-y-1">
          <p>
            <span>
              日本語の翻訳はまだ初期段階であり、誤りや不自然な表現がある可能性があります。
            </span>
          </p>
          <p>
            The Japanese translation is in its early stages and may have
            accuracy issues.
          </p>
          <p>
            <Link
              href="https://crowdin.com/project/joexyz-ba-tools"
              target="_blank"
              rel="noreferrer noopener"
              className="underline font-medium hover:no-underline focus:outline-none focus:ring-2 focus:ring-yellow-600 dark:focus:ring-yellow-400"
            >
              <span>Crowdinで翻訳の改善にご協力ください</span>
              {" · "}
              Help improve it on Crowdin
            </Link>
          </p>
        </div>

        <Button variant="ghost" onClick={handleDismiss}>
          <XIcon />
        </Button>
      </div>
    </section>
  );
}
