"use client";

import {
  type BlockedCoords,
  type DisplayedItem,
  Grid,
  type SelectRegion,
} from "@/app/inventory-management/_components/grid";
import {
  type InventoryManagementPreset,
  inventoryManagementPresets,
} from "@/app/inventory-management/_lib/presets";
import { LoadInventoryPresetDialog } from "@/components/dialogs/load-inventory-management-preset-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type AoiInventoryData,
  type AoiInventorySlot,
  aoiInventoryStorage,
} from "@/lib/storage/aoi-inventory";
import type {
  InventoryManagementItem,
  InitEvent,
  InventoryManagementResult,
  SimulateInventoryManagementEvent,
  WorkerResponse,
} from "@/workers/types";
import { MoveIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type SetStateAction, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { MessageBox } from "@/components/common/message-box";
import { useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";

function ItemSetup({
  title,
  item,
  onChange,
  isPlacing,
  onPlacingToggled,
}: {
  title: string;
  item: InventoryManagementItem;
  onChange: (newItem: Partial<InventoryManagementItem>) => void;
  isPlacing?: boolean;
  onPlacingToggled?: (rotated: boolean) => void;
}) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex flex-col gap-2">
            <Label>{t("common.width")}</Label>
            <Input
              type="number"
              min={1}
              max={4}
              value={item.width}
              onChange={(e) =>
                onChange({
                  width: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("common.height")}</Label>
            <Input
              type="number"
              min={1}
              max={4}
              value={item.height}
              onChange={(e) =>
                onChange({
                  height: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("common.count")}</Label>
            <Input
              type="number"
              min={0}
              max={7}
              value={item.count}
              onChange={(e) =>
                onChange({
                  count: Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {item.width === item.height && item.count > 0 && (
            <Button
              variant={isPlacing ? "destructive" : "outline"}
              onClick={() => onPlacingToggled?.(false)}
            >
              {isPlacing && <XIcon />}
              {!isPlacing && <MoveIcon />}
              {isPlacing ? t("common.cancel") : t("common.place")}
            </Button>
          )}

          {item.width !== item.height && item.count > 0 && (
            <>
              <Button
                variant={isPlacing ? "destructive" : "outline"}
                onClick={() => onPlacingToggled?.(false)}
              >
                {isPlacing && <XIcon />}
                {!isPlacing && <MoveIcon />}
                {isPlacing ? t("common.cancel") : t("common.placeHorizontally")}
              </Button>

              {!isPlacing && (
                <Button
                  variant="outline"
                  onClick={() => onPlacingToggled?.(true)}
                >
                  {!isPlacing && <MoveIcon />}
                  {isPlacing ? t("common.cancel") : t("common.placeVertically")}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryManagementSimulatorView() {
  const t = useTranslations();
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const searchParams = useSearchParams();

  const presetParam = searchParams.get("preset");
  const roundParam = searchParams.get("round");
  const slotParam = searchParams.get("slot");

  const [requestInProgress, setRequestInProgress] = useState(false);

  const [displayedItem, setDisplayedItem] = useState<
    DisplayedItem | undefined
  >();

  const [preset, setPreset] = useState<InventoryManagementPreset | null>(null);
  const [presetRoundIndex, setPresetRoundIndex] = useState<number>(0);

  const LAST_PRESET =
    inventoryManagementPresets[inventoryManagementPresets.length - 1];
  const FIRST_ROUND = LAST_PRESET.rounds[0];

  const [firstItem, setFirstItem] = useState<InventoryManagementItem>({
    width: FIRST_ROUND[0].width,
    height: FIRST_ROUND[0].height,
    count: FIRST_ROUND[0].count,
  });

  const [secondItem, setSecondItem] = useState<InventoryManagementItem>({
    width: FIRST_ROUND[1].width,
    height: FIRST_ROUND[1].height,
    count: FIRST_ROUND[1].count,
  });

  const [thirdItem, setThirdItem] = useState<InventoryManagementItem>({
    width: FIRST_ROUND[2].width,
    height: FIRST_ROUND[2].height,
    count: FIRST_ROUND[2].count,
  });

  const [results, setResults] = useState<
    NonNullable<InventoryManagementResult["result"]> | undefined
  >();

  const [blockedCells, setBlockedCells] = useState<BlockedCoords[]>([]);

  const [selectRegion, setSelectRegion] = useState<SelectRegion>({
    width: 1,
    height: 1,
  });

  const [placingItem, setPlacingItem] =
    useState<InventoryManagementItem | null>(null);

  const [saveData, setSaveData] = useState<AoiInventoryData | null>(null);

  function handleWantsToBlockCell(coords: BlockedCoords) {
    const endX = coords.x + selectRegion.width - 1;
    const endY = coords.y + selectRegion.height - 1;

    if (endX >= 9 || endY >= 5) {
      toast.error(t("tools.inventoryManagement.toasts.cannotBlockOutside"));
      return;
    }

    setBlockedCells((oldBlockedCells) => {
      const newBlockedCells = [...oldBlockedCells];

      for (let x = coords.x; x <= endX; x++) {
        for (let y = coords.y; y <= endY; y++) {
          if (oldBlockedCells.some((cell) => cell.x === x && cell.y === y)) {
            continue;
          }

          newBlockedCells.push({ x, y });
        }
      }

      return newBlockedCells;
    });

    if (placingItem === firstItem) {
      setFirstItem((oldItem) => ({
        ...oldItem,
        count: Math.max(oldItem.count - 1, 0),
      }));
    }

    if (placingItem === secondItem) {
      setSecondItem((oldItem) => ({
        ...oldItem,
        count: Math.max(oldItem.count - 1, 0),
      }));
    }

    if (placingItem === thirdItem) {
      setThirdItem((oldItem) => ({
        ...oldItem,
        count: Math.max(oldItem.count - 1, 0),
      }));
    }

    setSelectRegion({ width: 1, height: 1 });
    setPlacingItem(null);
  }

  function handleWantsToUnblockCell(coords: BlockedCoords) {
    setBlockedCells((oldBlockedCells) =>
      oldBlockedCells.filter(
        (cell) => cell.x !== coords.x || cell.y !== coords.y,
      ),
    );
  }

  function startSimulation() {
    if (!ready || !workerRef.current) {
      return;
    }

    setRequestInProgress(true);

    workerRef.current.postMessage({
      type: "simulate_inventory_management",
      payload: {
        items: [firstItem, secondItem, thirdItem],
        blockedCells,
      },
    } satisfies SimulateInventoryManagementEvent);
  }

  function ingestSimulationResult({
    result,
    error,
  }: InventoryManagementResult) {
    if (error) {
      toast.error(error);
    } else {
      setResults(result ?? undefined);
    }

    setRequestInProgress(false);
  }

  function handleItemChange(
    setter: React.Dispatch<SetStateAction<InventoryManagementItem>>,
    newItem: Partial<InventoryManagementItem>,
  ) {
    setter((oldItem) => ({
      ...oldItem,
      ...newItem,
    }));
  }

  function changeDisplayedItem(value: string) {
    if (value === "all") {
      setDisplayedItem(undefined);
    } else if (value.includes("+")) {
      setDisplayedItem(value as DisplayedItem);
    } else {
      setDisplayedItem(Number(value) as DisplayedItem);
    }
  }

  function handleReset() {
    setResults(undefined);
    setBlockedCells([]);
  }

  function handleLoad(slot: AoiInventorySlot) {
    const data = aoiInventoryStorage.get();
    if (!data || !data[slot]) {
      toast.warning(t("tools.inventoryManagement.toasts.noSavedData"));
      return;
    }

    const { presetId, roundIndex, first, second, third, blockedCells } =
      data[slot];

    setFirstItem(first);
    setSecondItem(second);
    setThirdItem(third);
    setBlockedCells(blockedCells);

    if (presetId) {
      const preset = inventoryManagementPresets.find((p) => p.id === presetId);
      if (preset) {
        setPreset(preset);
        setPresetRoundIndex(roundIndex ?? 0);
      }
    }

    toast.success(t("tools.inventoryManagement.toasts.dataLoaded"));
  }

  function handleSave(slot: AoiInventorySlot) {
    const oldStorage = aoiInventoryStorage.get() ?? {};

    aoiInventoryStorage.set({
      ...oldStorage,
      [slot]: {
        savedAt: Date.now(),
        presetId: preset?.id,
        roundIndex: presetRoundIndex,
        first: firstItem,
        second: secondItem,
        third: thirdItem,
        blockedCells,
      },
    });

    setSaveData((oldData) => ({
      ...oldData,
      [slot]: {
        savedAt: Date.now(),
        presetId: preset?.id,
        roundIndex: presetRoundIndex,
        first: firstItem,
        second: secondItem,
        third: thirdItem,
        blockedCells,
      },
    }));

    toast.success(t("tools.inventoryManagement.toasts.dataSaved"));
  }

  function handlePresetLoaded(id: string, roundIndex: number) {
    const preset = inventoryManagementPresets.find((p) => p.id === id);
    if (!preset) {
      toast.error(t("tools.inventoryManagement.toasts.presetNotFound"));
      return;
    }

    if (roundIndex < 0) {
      toast.error(t("tools.inventoryManagement.toasts.invalidRound"));
      return;
    }

    const round = preset.rounds[Math.min(roundIndex, preset.rounds.length - 1)];
    const [first, second, third] = round;

    setPreset(preset);
    setPresetRoundIndex(roundIndex);

    setFirstItem({
      width: first.width,
      height: first.height,
      count: first.count,
    });

    setSecondItem({
      width: second.width,
      height: second.height,
      count: second.count,
    });

    setThirdItem({
      width: third.width,
      height: third.height,
      count: third.count,
    });

    setBlockedCells([]);
    setResults(undefined);

    toast.success(
      t("tools.inventoryManagement.toasts.presetLoaded", { name: preset.name, round: roundIndex + 1 }),
    );
  }

  function onPlacingToggled(item: InventoryManagementItem, rotated: boolean) {
    if (placingItem === item) {
      setPlacingItem(null);
      setSelectRegion({ width: 1, height: 1 });
      return;
    }

    const width = rotated ? item.height : item.width;
    const height = rotated ? item.width : item.height;

    setPlacingItem(item);
    setSelectRegion({ width, height });
  }

  function handleNextRound() {
    if (!preset) {
      return;
    }

    handlePresetLoaded(preset.id, presetRoundIndex + 1);
  }

  useEffect(() => {
    const worker = new Worker(
      new URL("../../../workers/native-modules", import.meta.url),
    );
    workerRef.current = worker;

    worker.addEventListener(
      "message",
      (event: MessageEvent<WorkerResponse>) => {
        switch (event.data.type) {
          case "init": {
            setReady(event.data.success);
            setInitError(event.data.error ?? null);
            break;
          }

          case "simulate_inventory_management": {
            ingestSimulationResult(event.data.result);
            break;
          }
        }
      },
    );

    const baseUrl = window.location.origin;

    worker.postMessage({
      type: "init",
      payload: {
        baseUrl,
      },
    } satisfies InitEvent);

    const saveData = aoiInventoryStorage.get();
    setSaveData(saveData);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const parsedSlotParam = slotParam
      ? Number.parseInt(slotParam, 10)
      : undefined;

    if (
      parsedSlotParam &&
      !Number.isNaN(parsedSlotParam) &&
      parsedSlotParam >= 1 &&
      parsedSlotParam <= 3
    ) {
      const slot = `slot${parsedSlotParam}` as AoiInventorySlot;
      handleLoad(slot);
      return;
    }

    let preset: InventoryManagementPreset | undefined;
    let roundIndex = 0;

    if (presetParam) {
      preset = inventoryManagementPresets.find((p) => p.id === presetParam);
    }

    if (preset && roundParam) {
      const parsedRoundParam = Number.parseInt(roundParam, 10);

      if (!Number.isNaN(parsedRoundParam) && parsedRoundParam >= 1) {
        roundIndex = parsedRoundParam - 1;
      }
    }

    if (preset) {
      handlePresetLoaded(preset.id, roundIndex);
    }
  }, [presetParam, roundParam, slotParam]);

  if (initError) {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        <strong>Error:</strong> {initError}
      </MessageBox>
    );
  }

  if (!ready) {
    return <MessageBox>{t("common.loadingNativeModules")}</MessageBox>;
  }

  return (
    <div className="flex flex-col gap-8 items-center justify-center">
      <div className="flex flex-col gap-4 justify-center items-center">
        <div className="text-muted-foreground text-sm">
          <strong>{t("tools.inventoryManagement.remainingSlots")}</strong> {45 - blockedCells.length} / 45
        </div>

        <Grid
          probabilities={results}
          displayedItem={displayedItem}
          blockedCells={blockedCells}
          selectRegion={selectRegion}
          onWantsToBlockCell={handleWantsToBlockCell}
          onWantsToUnblockCell={handleWantsToUnblockCell}
        />

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <Button onClick={startSimulation} disabled={requestInProgress}>
            {t("tools.inventoryManagement.simulate")}
          </Button>

          <Select
            value=""
            onValueChange={(val) => handleLoad(val as AoiInventorySlot)}
          >
            <SelectTrigger>{t("tools.inventoryManagement.load")}</SelectTrigger>

            <SelectContent>
              <SelectItem value="slot1" disabled={!saveData?.slot1}>
                {saveData?.slot1
                  ? t("tools.inventoryManagement.slotLastSave", {
                      number: 1,
                      time: formatDistanceToNow(saveData.slot1.savedAt, {
                        addSuffix: true,
                      }),
                    })
                  : t("tools.inventoryManagement.slotEmpty", { number: 1 })}
              </SelectItem>

              <SelectItem value="slot2" disabled={!saveData?.slot2}>
                {saveData?.slot2
                  ? t("tools.inventoryManagement.slotLastSave", {
                      number: 2,
                      time: formatDistanceToNow(saveData.slot2.savedAt, {
                        addSuffix: true,
                      }),
                    })
                  : t("tools.inventoryManagement.slotEmpty", { number: 2 })}
              </SelectItem>

              <SelectItem value="slot3" disabled={!saveData?.slot3}>
                {saveData?.slot3
                  ? t("tools.inventoryManagement.slotLastSave", {
                      number: 3,
                      time: formatDistanceToNow(saveData.slot3.savedAt, {
                        addSuffix: true,
                      }),
                    })
                  : t("tools.inventoryManagement.slotEmpty", { number: 3 })}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value=""
            onValueChange={(val) => handleSave(val as AoiInventorySlot)}
          >
            <SelectTrigger>{t("tools.inventoryManagement.save")}</SelectTrigger>

            <SelectContent>
              <SelectItem value="slot1">
                {saveData?.slot1
                  ? t("tools.inventoryManagement.slotLastSave", {
                      number: 1,
                      time: formatDistanceToNow(saveData.slot1.savedAt, {
                        addSuffix: true,
                      }),
                    })
                  : t("tools.inventoryManagement.slotEmpty", { number: 1 })}
              </SelectItem>

              <SelectItem value="slot2">
                {saveData?.slot2
                  ? t("tools.inventoryManagement.slotLastSave", {
                      number: 2,
                      time: formatDistanceToNow(saveData.slot2.savedAt, {
                        addSuffix: true,
                      }),
                    })
                  : t("tools.inventoryManagement.slotEmpty", { number: 2 })}
              </SelectItem>

              <SelectItem value="slot3">
                {saveData?.slot3
                  ? t("tools.inventoryManagement.slotLastSave", {
                      number: 3,
                      time: formatDistanceToNow(saveData.slot3.savedAt, {
                        addSuffix: true,
                      }),
                    })
                  : t("tools.inventoryManagement.slotEmpty", { number: 3 })}
              </SelectItem>
            </SelectContent>
          </Select>

          <LoadInventoryPresetDialog onFinish={handlePresetLoaded}>
            <Button variant="outline">{t("tools.inventoryManagement.loadPreset")}</Button>
          </LoadInventoryPresetDialog>

          <Button variant="destructive" onClick={handleReset}>
            {t("tools.inventoryManagement.reset")}
          </Button>
        </div>
      </div>

      {preset && (
        <Card className="py-2">
          <CardContent className="flex flex-col md:flex-row gap-2 items-center justify-between">
            <div className="text-sm text-muted-foreground text-center">
              {t("tools.inventoryManagement.preset")} <strong>{preset.name}</strong>, {t("tools.inventoryManagement.round")}{" "}
              <strong>{presetRoundIndex + 1}</strong>
            </div>

            <ConfirmDialog
              title={t("tools.inventoryManagement.confirmNextRound.title")}
              description={t("tools.inventoryManagement.confirmNextRound.description")}
              confirmText={t("tools.inventoryManagement.confirmNextRound.confirm")}
              cancelText={t("tools.inventoryManagement.confirmNextRound.cancel")}
              onConfirm={handleNextRound}
            >
              <Button variant="outline" size="sm">
                {t("tools.inventoryManagement.nextRound")}
              </Button>
            </ConfirmDialog>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <ItemSetup
          title={t("tools.inventoryManagement.firstItem")}
          item={firstItem}
          onChange={(newItem) => handleItemChange(setFirstItem, newItem)}
          isPlacing={placingItem === firstItem}
          onPlacingToggled={(rotated) => onPlacingToggled(firstItem, rotated)}
        />

        <ItemSetup
          title={t("tools.inventoryManagement.secondItem")}
          item={secondItem}
          onChange={(newItem) => handleItemChange(setSecondItem, newItem)}
          isPlacing={placingItem === secondItem}
          onPlacingToggled={(rotated) => onPlacingToggled(secondItem, rotated)}
        />

        <ItemSetup
          title={t("tools.inventoryManagement.thirdItem")}
          item={thirdItem}
          onChange={(newItem) => handleItemChange(setThirdItem, newItem)}
          isPlacing={placingItem === thirdItem}
          onPlacingToggled={(rotated) => onPlacingToggled(thirdItem, rotated)}
        />
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <Label>{t("tools.inventoryManagement.displayedItems")}</Label>

        <ToggleGroup
          type="single"
          variant="outline"
          value={displayedItem ? displayedItem.toString() : "all"}
          onValueChange={changeDisplayedItem}
        >
          <ToggleGroupItem className="px-4" value="all">
            {t("tools.inventoryManagement.all")}
          </ToggleGroupItem>

          <ToggleGroupItem className="px-4" value="1">
            1
          </ToggleGroupItem>

          <ToggleGroupItem className="px-4" value="2">
            2
          </ToggleGroupItem>

          <ToggleGroupItem className="px-4" value="3">
            3
          </ToggleGroupItem>

          <ToggleGroupItem className="px-4" value="1+2">
            1 + 2
          </ToggleGroupItem>

          <ToggleGroupItem className="px-4" value="1+3">
            1 + 3
          </ToggleGroupItem>

          <ToggleGroupItem className="px-4" value="2+3">
            2 + 3
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
