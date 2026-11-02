import { auth } from "@clerk/nextjs/server";
import { OwnRostersBrowser } from "@/app/[locale]/user/rosters/_components/own-rosters-browser";

export default async function MyRostersHomePage() {
  await auth.protect();
  return <OwnRostersBrowser />;
}
