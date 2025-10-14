import { RosterEditor } from "@/app/user/rosters/_components/roster-editor";
import type { Id } from "~convex/dataModel";

export default async function ManageRosterPage({
  params,
}: {
  params: Promise<{ rosterId: Id<"roster"> }>;
}) {
  const { rosterId } = await params;
  return <RosterEditor rosterId={rosterId} />;
}
