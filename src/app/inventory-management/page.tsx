import { InventoryManagementSimulatorView } from "@/app/inventory-management/_components/simulator-view";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { HelpCircleIcon } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schale Inventory Management Simulator - Joe's Blue Archive Tools",
  description:
    "Simulate the likelihood of each item's placement in the Schale inventory management event.",
  twitter: {
    card: "summary",
  },
};

export default async function InventoryManagementPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Inventory Management</h1>
          <HelpSheet document="inventory-management">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>
        <p>
          This tool allows you to simulate the probabilities of each item's
          placement in the inventory management events (e.g. Aoi's event).
        </p>

        <p className="text-muted-foreground">
          <strong>Note:</strong> While the tool does have some biases and
          multiple checks in place to finetune the probabilities, at the end of
          the day, it can still result in false positives, especially when the
          board contains many small items. Use the results as a guideline, not
          as a guarantee.
        </p>
      </div>

      <InventoryManagementSimulatorView />
    </div>
  );
}
