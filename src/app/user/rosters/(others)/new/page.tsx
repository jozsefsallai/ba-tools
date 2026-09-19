import { CreateRoster } from "@/app/user/rosters/_components/create-roster";
import { auth } from "@clerk/nextjs/server";

export default async function NewRosterPage() {
  await auth.protect();
  return <CreateRoster />;
}
