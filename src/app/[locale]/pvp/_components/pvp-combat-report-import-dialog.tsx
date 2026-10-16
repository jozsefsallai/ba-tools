"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useStudents } from "@/hooks/use-students";
import type { PvpBattleInfo } from "@/lib/pvp";
import type { PvpOcrClient } from "@/lib/pvp/ocr";
import { getScreenshotROIs } from "@/lib/pvp/screenshot";
import { PvpScreenshotAlignmentError } from "@/lib/pvp/screenshot-layout";
import {
  PVP_SCREENSHOT_INPUT_TYPES,
  PVP_SCREENSHOT_MAX_INPUT_SIZE,
} from "@/lib/pvp/screenshot-types";
import { CheckIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type ClipboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

export function PvpCombatReportImportDialog({
  children,
  recognizeOpponentName = true,
  onImported,
}: {
  children?: (open: () => void) => ReactNode;
  recognizeOpponentName?: boolean;
  onImported: (battle: PvpBattleInfo) => void | Promise<void>;
}) {
  const t = useTranslations();

  const { studentMap } = useStudents();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "reading" | "extracting" | "applying"
  >("idle");
  const [engineStatus, setEngineStatus] = useState<
    "loading" | "ready" | "failed"
  >("loading");

  const inputRef = useRef<HTMLInputElement>(null);
  const clientRef = useRef<Promise<PvpOcrClient> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const jobRef = useRef(0);
  const warmupGenerationRef = useRef(0);

  const importState = status === "idle" ? engineStatus : "extracting";

  const getClient = useCallback(() => {
    clientRef.current ??= import("@/lib/pvp/ocr").then(
      ({ PvpOcrClient }) => new PvpOcrClient(),
    );
    return clientRef.current;
  }, []);

  useEffect(
    () => () => {
      jobRef.current++;
      warmupGenerationRef.current++;
      abortRef.current?.abort();
      void clientRef.current?.then((client) => client.dispose());
      clientRef.current = null;
    },
    [],
  );

  function changeDialog(open: boolean) {
    setDialogOpen(open);

    if (open) {
      const generation = ++warmupGenerationRef.current;
      setEngineStatus((current) =>
        current === "failed" ? "loading" : current,
      );

      void getClient()
        .then((client) => client.warmup())
        .then(() => {
          if (generation === warmupGenerationRef.current) {
            setEngineStatus("ready");
          }
        })
        .catch(() => {
          if (generation === warmupGenerationRef.current) {
            setEngineStatus("failed");
          }
        });
    } else {
      jobRef.current++;

      if (abortRef.current && status !== "reading") {
        warmupGenerationRef.current++;
        setEngineStatus("loading");
      }

      abortRef.current?.abort();
      abortRef.current = null;
      setStatus("idle");
    }
  }

  async function handleCombatReport(file: File) {
    if (abortRef.current) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const job = ++jobRef.current;
    const active = () => !controller.signal.aborted && job === jobRef.current;

    try {
      setStatus("reading");

      if (
        !PVP_SCREENSHOT_INPUT_TYPES.some((type) => type === file.type) ||
        file.size === 0 ||
        file.size > PVP_SCREENSHOT_MAX_INPUT_SIZE
      ) {
        throw new Error(
          "Screenshot must be a supported image between 1 byte and 10 MB",
        );
      }

      const [rois, client] = await Promise.all([
        getScreenshotROIs(file),
        getClient(),
      ]);

      if (!active()) {
        return;
      }

      setStatus("extracting");

      const parsed = await client.extract(rois, {
        signal: controller.signal,
        students: Object.values(studentMap),
        recognizeOpponentName,
      });

      if (!active()) {
        return;
      }

      if (parsed.valid) {
        setEngineStatus("ready");
      }

      if (!parsed.valid || !parsed.battle) {
        toast.error(t("tools.pvp.reportImport.invalid"), {
          position: "top-right",
        });

        return;
      }

      setStatus("applying");

      await onImported(parsed.battle);

      setDialogOpen(false);
    } catch (error) {
      if (!active()) {
        return;
      }

      console.error(error);

      toast.error(
        t(
          error instanceof PvpScreenshotAlignmentError
            ? "tools.pvp.reportImport.alignmentFailed"
            : "tools.pvp.reportImport.failed",
        ),
        {
          position: "top-right",
        },
      );
    } finally {
      if (job === jobRef.current) {
        abortRef.current = null;
        setStatus("idle");
      }
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (status !== "idle") {
      return;
    }

    const imageItem = Array.from(event.clipboardData.items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );

    const file = imageItem?.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();
    void handleCombatReport(file);
  }

  return (
    <>
      {children?.(() => changeDialog(true))}

      <Dialog open={dialogOpen} onOpenChange={changeDialog}>
        <DialogContent onPaste={handlePaste}>
          <DialogHeader>
            <DialogTitle>{t("tools.pvp.reportImport.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("tools.pvp.reportImport.disclaimer", {
                shortcut: (children) => <Kbd>{children}</Kbd>,
              })}
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <TriangleAlertIcon aria-hidden="true" />
            <AlertDescription>
              {t("tools.pvp.screenshotImport.extractionNotice")}
            </AlertDescription>
          </Alert>

          <button
            type="button"
            className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted/50"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) void handleCombatReport(file);
            }}
            disabled={status !== "idle"}
          >
            {status === "idle" && (
              <>
                <span className="font-medium text-foreground">
                  {t("tools.pvp.reportImport.drop")}
                </span>

                <span>{t("tools.pvp.reportImport.browse")}</span>

                <span className="mt-2 flex items-center gap-1.5 text-xs">
                  {t("tools.pvp.reportImport.pasteHint")}
                  <Kbd>Ctrl/Cmd + V</Kbd>
                </span>
              </>
            )}

            {status === "reading" && t("tools.pvp.reportImport.reading")}

            {status === "extracting" && t("tools.pvp.reportImport.extracting")}

            {status === "applying" && t("tools.pvp.reportImport.applying")}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={PVP_SCREENSHOT_INPUT_TYPES.join(",")}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleCombatReport(file);
              event.target.value = "";
            }}
          />

          <output
            aria-atomic="true"
            className={`flex min-h-5 items-center gap-2 text-sm font-bold ${
              importState === "ready"
                ? "text-green-600 dark:text-green-400"
                : importState === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {importState === "ready" ? (
              <CheckIcon
                className="size-4 shrink-0"
                strokeWidth={3}
                aria-hidden
              />
            ) : importState === "failed" ? (
              <TriangleAlertIcon
                className="size-4 shrink-0 text-destructive"
                aria-hidden
              />
            ) : (
              <LoaderCircleIcon
                className="size-4 shrink-0 animate-spin"
                aria-hidden
              />
            )}
            <span>
              {importState === "ready"
                ? t("tools.pvp.reportImport.engineReady")
                : importState === "failed"
                  ? t("tools.pvp.reportImport.engineFailed")
                  : importState === "extracting"
                    ? t("tools.pvp.reportImport.extractionInProgress")
                    : t("tools.pvp.reportImport.loadingAssets")}
            </span>
          </output>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => changeDialog(false)}
            >
              {t("tools.pvp.reportImport.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
