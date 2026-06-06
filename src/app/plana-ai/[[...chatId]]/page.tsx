import { PlanaAiView } from "@/app/plana-ai/_components/plana-ai-view";
import { canAccessPlanaAi } from "@/lib/ai/plana-access";
import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Id } from "~convex/dataModel";

type PageParams = {
  chatId?: string[];
};

export const metadata: Metadata = {
  title: "Plana AI - Joe's Blue Archive Tools",
  description: "Chat with Plana.",
  twitter: {
    card: "summary",
  },
};

export default async function PlanaAIPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const user = await currentUser();

  if (!canAccessPlanaAi(user)) {
    return redirect("/");
  }

  const { chatId: chatIdSegments } = await params;
  const chatId = chatIdSegments?.[0] as Id<"planaChat"> | undefined;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <PlanaAiView chatId={chatId} />
    </div>
  );
}
