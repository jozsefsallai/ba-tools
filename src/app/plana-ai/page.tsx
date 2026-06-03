import { PlanaChat } from "@/app/plana-ai/_components/plana-chat";
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
  const isEnabled = process.env.NEXT_PUBLIC_PLANA_AI_ENABLED === "true";

  if (!isEnabled) {
    return redirect("/");
  }

  return (
    <div className="h-full">
      <PlanaChat />
    </div>
  );
}
