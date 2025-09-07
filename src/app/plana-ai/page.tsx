import { PlanaView } from "@/app/plana-ai/_components/plana-view";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Plana AI - Joe's Blue Archive Tools",
  description: "Chat with Plana.",
  twitter: {
    card: "summary",
  },
};

export default async function PlanaAIPage() {
  const isEnabled = process.env.PLANA_AI_ENABLED === "true";

  if (!isEnabled) {
    return redirect("/");
  }

  return (
    <div className="flex flex-col gap-10 h-full">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-bold">Plana AI</h1>
      </div>

      <PlanaView />
    </div>
  );
}
