import { PvpIconDebugger } from "@/app/[locale]/pvp/_components/pvp-icon-debugger";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "PVP student icon test runner" };

export default function PvpIconDebugPage() {
  return <PvpIconDebugger />;
}
