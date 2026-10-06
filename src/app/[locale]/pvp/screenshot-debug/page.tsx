import { PvpScreenshotDebugger } from "@/app/[locale]/pvp/_components/pvp-screenshot-debugger";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PVP screenshot ROI debugger",
};

export default function PvpScreenshotDebugPage() {
  return <PvpScreenshotDebugger />;
}
