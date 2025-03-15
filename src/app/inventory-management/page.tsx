import { InventoryManagementSimulatorView } from "@/app/inventory-management/_components/simulator-view";

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
        <h1 className="text-xl font-bold">Inventory Management</h1>
        <p>
          This tool allows you to simulate the probabilities of each item's
          placement in the inventory management events (e.g. Aoi's event).
        </p>
      </div>

      <InventoryManagementSimulatorView />
    </div>
  );
}
