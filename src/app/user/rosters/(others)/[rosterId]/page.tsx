import { RosterEditor } from "@/app/user/rosters/_components/roster-editor";
import { DirtyStateTrackerProvider } from "@/components/providers/dirty-state-tracker-provider";
import type { Id } from "~convex/dataModel";

export default async function ManageRosterPage({
  params,
}: {
  params: Promise<{ rosterId: Id<"roster"> }>;
}) {
  const { rosterId } = await params;
  return (
    <DirtyStateTrackerProvider loggedInOnly>
      <RosterEditor rosterId={rosterId} />
    </DirtyStateTrackerProvider>
  );
}
