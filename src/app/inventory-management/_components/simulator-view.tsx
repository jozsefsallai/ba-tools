"use client";

import {
  type BlockedCoords,
  type DisplayedItem,
  Grid,
} from "@/app/inventory-management/_components/grid";
import {
  inventoryManagementPresets,
  type InventoryManagementPresetItem,
} from "@/app/inventory-management/_lib/presets";
import { LoadInventoryPresetDialog } from "@/components/dialogs/load-inventory-management-preset-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { aoiInventoryStorage } from "@/lib/storage/aoi-inventory";
import type {
  InventoryManagementItem,
  InitEvent,
  InventoryManagementResult,
  SimulateInventoryManagementEvent,
  WorkerResponse,
} from "@/workers/types";
import { type SetStateAction, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function ItemSetup({
  title,
  item,
  onChange,
}: {
  title: string;
  item: InventoryManagementItem;
  onChange: (newItem: Partial<InventoryManagementItem>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent className="flex gap-2">
        <div className="flex flex-col gap-2">
          <Label>Width</Label>
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
          <Label>Height</Label>
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
          <Label>Count</Label>
          <Input
            type="number"
            min={0}
            max={6}
            value={item.count}
            onChange={(e) =>
              onChange({
                count: Number(e.target.value),
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryManagementSimulatorView() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const [requestInProgress, setRequestInProgress] = useState(false);

  const [displayedItem, setDisplayedItem] = useState<
    DisplayedItem | undefined
  >();

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

  function handleWantsToBlockCell(coords: BlockedCoords) {
    setBlockedCells((oldBlockedCells) => [...oldBlockedCells, coords]);
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
    } else {
      setDisplayedItem(Number(value) as DisplayedItem);
    }
  }

  function handleReset() {
    setResults(undefined);
    setBlockedCells([]);
  }

  function handleLoad() {
    const data = aoiInventoryStorage.get();
    if (!data) {
      toast.warning("No saved data found.");
      return;
    }

    setFirstItem(data.first);
    setSecondItem(data.second);
    setThirdItem(data.third);
    setBlockedCells(data.blockedCells);

    toast.success("Data loaded successfully.");
  }

  function handleSave() {
    aoiInventoryStorage.set({
      first: firstItem,
      second: secondItem,
      third: thirdItem,
      blockedCells,
    });

    toast.success("Data saved successfully.");
  }

  function handlePresetLoaded(
    name: string,
    {
      first,
      second,
      third,
    }: {
      first: InventoryManagementPresetItem;
      second: InventoryManagementPresetItem;
      third: InventoryManagementPresetItem;
    },
  ) {
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

    toast.success(`Preset "${name}" loaded successfully.`);
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

    worker.postMessage({ type: "init" } satisfies InitEvent);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  if (initError) {
    return <div>Error: {initError}</div>;
  }

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-8 items-center justify-center">
      <div className="flex flex-col gap-4 justify-center items-center">
        <Grid
          probabilities={results}
          displayedItem={displayedItem}
          blockedCells={blockedCells}
          onWantsToBlockCell={handleWantsToBlockCell}
          onWantsToUnblockCell={handleWantsToUnblockCell}
        />

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <Button onClick={startSimulation} disabled={requestInProgress}>
            Simulate
          </Button>

          <Button variant="outline" onClick={handleLoad}>
            Load
          </Button>

          <Button variant="outline" onClick={handleSave}>
            Save
          </Button>

          <Button variant="destructive" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <ItemSetup
          title="First Item"
          item={firstItem}
          onChange={(newItem) => handleItemChange(setFirstItem, newItem)}
        />

        <ItemSetup
          title="Second Item"
          item={secondItem}
          onChange={(newItem) => handleItemChange(setSecondItem, newItem)}
        />

        <ItemSetup
          title="Third Item"
          item={thirdItem}
          onChange={(newItem) => handleItemChange(setThirdItem, newItem)}
        />
      </div>

      <LoadInventoryPresetDialog onFinish={handlePresetLoaded}>
        <Button variant="outline">Load Preset</Button>
      </LoadInventoryPresetDialog>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <Label>Displayed Items:</Label>

        <ToggleGroup
          type="single"
          variant="outline"
          value={displayedItem ? displayedItem.toString() : "all"}
          onValueChange={changeDisplayedItem}
        >
          <ToggleGroupItem className="px-4" value="all">
            All
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
        </ToggleGroup>
      </div>
    </div>
  );
}
