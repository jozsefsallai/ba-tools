import { getLocale, getTranslations } from "next-intl/server";
import { InventoryScanner } from "@/app/[locale]/inventory-scanner/_components/inventory-scanner";
import { getScanItems } from "@/lib/data/scan-items.server";
import { getCardMetadata } from "@/lib/og-metadata.server";

export const revalidate = 86_400;

export async function generateMetadata() {
  return getCardMetadata("inventory-scanner", await getLocale());
}

export default async function InventoryScannerPage() {
  const t = await getTranslations();
  const items = await getScanItems();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">
          {t("tools.inventoryScanner.title")}
        </h1>
        <p className="text-muted-foreground max-w-prose text-sm">
          {t("tools.inventoryScanner.description")}
        </p>
      </div>

      <InventoryScanner items={items} />
    </div>
  );
}
