"use client";

import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  CheckIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getWriteVerb,
  isWriteTool,
  type PlanaToolView,
} from "@/lib/ai/tool-parts";

export function ToolActivity({ tool }: { tool: PlanaToolView }) {
  const t = useTranslations();
  const isWrite = isWriteTool(tool.toolName);
  const verb = getWriteVerb(tool.toolName);

  function getLabel() {
    switch (tool.status) {
      case "running": {
        const key =
          `tools.plana.tools.running.${tool.toolName}` as "tools.plana.tools.running.fallback";

        if (t.has(key)) {
          return t(key);
        }

        return verb
          ? t(`tools.plana.tools.writes.${verb}.running`)
          : t("tools.plana.tools.running.fallback");
      }
      case "done": {
        const key =
          `tools.plana.tools.done.${tool.toolName}` as "tools.plana.tools.done.fallback";

        if (t.has(key)) {
          return t(key);
        }

        return verb
          ? t(`tools.plana.tools.writes.${verb}.done`)
          : t("tools.plana.tools.done.fallback");
      }
      case "denied":
        return t("tools.plana.tools.declined");
      case "pending":
        return t("tools.plana.tools.notSaved");
      default:
        return isWrite
          ? t("tools.plana.tools.saveFailed")
          : t("tools.plana.tools.failed");
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs">
      <span className="flex size-4 shrink-0 items-center justify-center">
        {tool.status === "running" ? (
          <LoaderCircleIcon className="size-3.5 animate-spin" />
        ) : tool.status === "done" ? (
          <CheckIcon className="size-3.5" />
        ) : tool.status === "error" ? (
          <AlertCircleIcon className="size-3.5 text-destructive" />
        ) : (
          <XIcon className="size-3.5" />
        )}
      </span>

      <span className="shrink-0">{getLabel()}</span>

      {tool.summary ? (
        <span className="truncate opacity-70">{tool.summary}</span>
      ) : null}

      {tool.link ? (
        <Link
          className="inline-flex shrink-0 items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:underline"
          href={tool.link}
        >
          {t("tools.plana.tools.open")}
          <ArrowUpRightIcon className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}
