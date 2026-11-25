"use client";

import { CopyIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { InventoryEntry } from "@/app/[locale]/inventory-scanner/_lib/entries";
import { Button } from "@/components/ui/button";
import { INVENTORY_EXPORTERS } from "@/lib/inventory-scan/exporters";
import type { InventoryExporter } from "@/lib/inventory-scan/exporters/types";

function Exporter({
  exporter,
  entries,
}: {
  exporter: InventoryExporter;
  entries: InventoryEntry[];
}) {
  const t = useTranslations();

  const supported = entries.filter(({ item }) => exporter.supports(item));
  const exported = supported.flatMap(({ item, count }) =>
    count === null
      ? []
      : [
          {
            item,
            count,
          },
        ],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(exporter.export(exported));
      toast.success(t("tools.inventoryScanner.export.copied"));
    } catch {
      toast.error(t("tools.inventoryScanner.export.copyFailed"));
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [
          exporter.export(exported),
        ],
        {
          type: "application/json",
        },
      ),
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = exporter.filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="font-medium">{exporter.name}</h3>

        <a
          href={exporter.url}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          {t("tools.inventoryScanner.export.open")}
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </div>

      <p className="text-muted-foreground text-sm">
        {t("tools.inventoryScanner.export.justinPlanner")}
      </p>

      <p className="text-sm tabular-nums">
        {t("tools.inventoryScanner.export.included", {
          count: exported.length,
          total: supported.length,
        })}
      </p>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={exported.length === 0}
          onClick={download}
        >
          <DownloadIcon />
          {t("tools.inventoryScanner.export.download")}
        </Button>

        <Button
          variant="outline"
          disabled={exported.length === 0}
          onClick={copy}
        >
          <CopyIcon />
          {t("tools.inventoryScanner.export.copy")}
        </Button>
      </div>
    </div>
  );
}

export function ExportBar({ entries }: { entries: InventoryEntry[] }) {
  const t = useTranslations();

  return (
    <section className="flex flex-col gap-3 border-t pt-4">
      <h2 className="font-semibold">
        {t("tools.inventoryScanner.export.title")}
      </h2>

      {INVENTORY_EXPORTERS.map((exporter) => (
        <Exporter key={exporter.id} exporter={exporter} entries={entries} />
      ))}
    </section>
  );
}
