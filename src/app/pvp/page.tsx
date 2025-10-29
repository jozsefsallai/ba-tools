import { PVPView } from "@/app/pvp/_components/pvp-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PVP Tracker - Joe's Blue Archive Tools",
  description: "Track your PVP battles in Blue Archive.",
  twitter: {
    card: "summary",
  },
};

export default async function PVPPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">PVP Tracker</h1>
        </div>
        <p>This tool allows you to track your PVP battles in Blue Archive.</p>
      </div>

      <PVPView />
    </div>
  );
}
