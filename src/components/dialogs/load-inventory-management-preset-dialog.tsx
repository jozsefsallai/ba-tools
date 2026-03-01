"use client";

import {
  type InventoryManagementPreset,
  inventoryManagementPresets,
} from "@/app/inventory-management/_lib/presets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  Fragment,
  type PropsWithChildren,
  useMemo,
  useRef,
  useState,
} from "react";

export type LoadInventoryManagementPresetDialogProps = PropsWithChildren<{
  onFinish: (id: string, roundIndex: number) => void;
}>;

export function LoadInventoryPresetDialog({
  children,
  onFinish,
}: LoadInventoryManagementPresetDialogProps) {
  const t = useTranslations();
  const [selectedPreset, setSelectedPreset] =
    useState<InventoryManagementPreset | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const [copiedPermalink, setCopiedPermalink] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);

  function onPresetSelected(preset: InventoryManagementPreset | null) {
    setSelectedRound(null);
    setSelectedPreset(preset);
  }

  function onRoundSelected(round: number | null) {
    setSelectedRound(round);
  }

  function handlePresetSelected(name: string) {
    if (name === "_null") {
      onPresetSelected(null);
    } else {
      onPresetSelected(
        inventoryManagementPresets.find((preset) => preset.name === name) ??
          null,
      );
    }
  }

  function handleRoundSelected(round: string) {
    if (round === "_null") {
      onRoundSelected(null);
    } else {
      onRoundSelected(Number(round));
    }
  }

  function buildRoundName(round: InventoryManagementPreset["rounds"][number]) {
    return round
      .map((item, idx) => (
        <Fragment key={idx}>
          <strong>{item.count}x</strong> {item.name}{" "}
          <strong>
            {item.width}x{item.height}
          </strong>
        </Fragment>
      ))
      .reduce((acc, curr) => (
        <Fragment key={acc.key}>
          {acc} / {curr}
        </Fragment>
      ));
  }

  function onPresetItemConfirmed() {
    if (!selectedPreset || selectedRound === null) {
      return;
    }

    onFinish(selectedPreset.id, selectedRound);

    closeRef.current?.click();
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setSelectedPreset(null);
      setSelectedRound(null);
    }
  }

  const permalink = useMemo(() => {
    if (!selectedPreset) {
      return null;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("preset", selectedPreset.id);

    if (selectedRound !== null) {
      url.searchParams.set("round", String(selectedRound + 1));
    }

    return url.toString();
  }, [selectedPreset, selectedRound]);

  async function handleCopyPermalink() {
    if (!permalink || copiedPermalink) {
      return;
    }

    setCopiedPermalink(true);
    await navigator.clipboard.writeText(permalink);
    setTimeout(() => setCopiedPermalink(false), 2000);
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tools.inventoryManagement.presetDialog.title")}</DialogTitle>

          <DialogDescription>
            {t("tools.inventoryManagement.presetDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 min-w-0 overflow-hidden">
          <Select
            value={selectedPreset?.name}
            onValueChange={handlePresetSelected}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t("tools.inventoryManagement.presetDialog.selectEvent")}
                className="text-ellipsis"
              />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectItem value="_null">{t("tools.inventoryManagement.presetDialog.none")}</SelectItem>

                {inventoryManagementPresets.map((preset, idx) => (
                  <SelectItem value={preset.name} key={idx}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={selectedRound === null ? "_null" : String(selectedRound)}
            onValueChange={handleRoundSelected}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("tools.inventoryManagement.presetDialog.selectRound")} />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectItem value="_null">{t("tools.inventoryManagement.presetDialog.none")}</SelectItem>

                {selectedPreset?.rounds.map((round, idx) => (
                  <SelectItem value={String(idx)} key={idx}>
                    {t("tools.inventoryManagement.presetDialog.roundLabel")}{" "}
                    {idx < selectedPreset.rounds.length - 1
                      ? idx + 1
                      : `${idx + 1}+`}
                    : {buildRoundName(round)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={!permalink || copiedPermalink}
            onClick={handleCopyPermalink}
          >
            {copiedPermalink ? t("tools.inventoryManagement.presetDialog.copied") : t("tools.inventoryManagement.presetDialog.copyPermalink")}
          </Button>

          <Button
            type="submit"
            onClick={onPresetItemConfirmed}
            disabled={selectedRound === null}
          >
            {t("tools.inventoryManagement.presetDialog.loadPresetData")}
          </Button>
        </DialogFooter>

        <DialogClose ref={closeRef} />
      </DialogContent>
    </Dialog>
  );
}
