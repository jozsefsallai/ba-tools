import { PvpIconDebugger } from "@/app/[locale]/pvp/_components/pvp-icon-debugger";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("pvp-icon-debug", await getLocale());
}

export default function PvpIconDebugPage() {
  return <PvpIconDebugger />;
}
