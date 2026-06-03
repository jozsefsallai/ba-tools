import { PlanaChat } from "@/app/plana-ai/_components/plana-chat";
import { canAccessPlanaAi } from "@/lib/ai/plana-access";
import { currentUser } from "@clerk/nextjs/server";
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
  const user = await currentUser();

  if (!canAccessPlanaAi(user)) {
    return redirect("/");
  }

  return (
    <div className="h-full">
      <PlanaChat />
    </div>
  );
}
