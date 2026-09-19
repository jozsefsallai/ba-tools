import { OwnRostersBrowser } from "@/app/user/rosters/_components/own-rosters-browser";
import { auth } from "@clerk/nextjs/server";

export default async function MyRostersHomePage() {
  await auth.protect();
  return <OwnRostersBrowser />;
}
