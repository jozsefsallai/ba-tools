import { PlanaAiView } from "@/app/[locale]/plana-ai/_components/plana-ai-view";
import { redirect } from "@/i18n/navigation";
import { canAccessPlanaAi } from "@/lib/ai/plana-access";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { currentUser } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

type PageParams = {
  chatId?: string[];
};

export async function generateMetadata() {
  return getCardMetadata("plana-ai-chatId", await getLocale());
}

export default async function PlanaAIPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const user = await currentUser();

  if (!canAccessPlanaAi(user)) {
    return redirect({ href: "/", locale: await getLocale() });
  }

  const { chatId: chatIdSegments } = await params;
  const chatId = chatIdSegments?.[0] as Id<"planaChat"> | undefined;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <PlanaAiView chatId={chatId} />
    </div>
  );
}
