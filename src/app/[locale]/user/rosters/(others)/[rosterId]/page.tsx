import { RosterEditor } from "@/app/[locale]/user/rosters/_components/roster-editor";
import { DirtyStateTrackerProvider } from "@/components/providers/dirty-state-tracker-provider";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "~convex/dataModel";

export default async function ManageRosterPage({
  params,
}: {
  params: Promise<{ rosterId: Id<"roster"> }>;
}) {
  await auth.protect();
  const { rosterId } = await params;
  return (
    <DirtyStateTrackerProvider loggedInOnly>
      <RosterEditor rosterId={rosterId} />
    </DirtyStateTrackerProvider>
  );
}
