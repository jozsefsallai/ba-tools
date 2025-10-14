import { GAME_SERVERS, type GameServer } from "@/lib/types";
import { redirect } from "next/navigation";

type PageParams = {
  gameServer: GameServer;
  friendCode: string;
};

export default async function RosterPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { gameServer, friendCode } = await params;

  if (!GAME_SERVERS.includes(gameServer)) {
    return redirect("/404");
  }

  return (
    <div>
      Roster Page for {gameServer} - {friendCode}
    </div>
  );
}
