import { PvpScreenshotDebugger } from "@/app/[locale]/pvp/_components/pvp-screenshot-debugger";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("pvp-screenshot-debug", await getLocale());
}

export default function PvpScreenshotDebugPage() {
  return <PvpScreenshotDebugger />;
}
