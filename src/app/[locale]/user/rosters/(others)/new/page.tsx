import { auth } from "@clerk/nextjs/server";
import { CreateRoster } from "@/app/[locale]/user/rosters/_components/create-roster";

export default async function NewRosterPage() {
  await auth.protect();
  return <CreateRoster />;
}
