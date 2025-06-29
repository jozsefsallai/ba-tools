import { useScenarioScript } from "@/app/scenario-image-generator/_hooks/use-scenario-script";
import {
  SCENARIO_VIEW_HEIGHT,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";
import * as PIXI from "pixi.js";

const TEST_SCENARIO_SCRIPT = `#0000
CHARA_CREATE nozomi
CHARA_SPRITE nozomi laughing https://static.wikitide.net/bluearchivewiki/8/88/Nozomi_03.png
CHARA_SPRITE nozomi surprised https://static.wikitide.net/bluearchivewiki/1/1a/Nozomi_06.png
CHARA_SPRITE nozomi normal https://static.wikitide.net/bluearchivewiki/8/87/Nozomi_00.png
CHARA_CREATE hikari
CHARA_SPRITE hikari annoyed https://static.wikitide.net/bluearchivewiki/4/4d/Hikari_07.png
CHARA_SPRITE hikari normal https://static.wikitide.net/bluearchivewiki/7/7b/Hikari_00.png
CHARA_SET hikari x:3000

#0001
FADE_IN
CHARA_SET nozomi scale:1.2 x:0 y:50
CHARA_FADE_IN nozomi time:500
NAME Nozomi
AFFILIATION CCC
CHARA_EXPR nozomi laughing
CHARA_MOVE nozomi y:30 time:200
CHARA_MOVE nozomi y:50 time:200
Pahyahya! This is definitely not gonna be hell to implement!
INPUT

#0002
CHARA_EXPR nozomi normal
But this is what the theoretical scripting language would look like.
INPUT

#0003
CLEAR_NAME
CLEAR_AFFILIATION
CLEAR_MESSAGE
CHARA_SET hikari scale:1.2 y:50
CHARA_EXPR hikari annoyed
CHARA_MOVE nozomi x:-300 time:200
CHARA_SET nozomi darken:true
CHARA_MOVE hikari x:100 time:500
CHARA_EXPR nozomi surprised
WAIT 1000
NAME Hikari
AFFILIATION CCC
Heeeey, don't leave me out!
INPUT
`;

export function ScenarioScriptRunner() {
  const { handleInput } = useScenarioScript(TEST_SCENARIO_SCRIPT);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: meh
    <pixiSprite
      texture={PIXI.Texture.EMPTY}
      width={SCENARIO_VIEW_WIDTH}
      height={SCENARIO_VIEW_HEIGHT}
      x={0}
      y={0}
      onClick={handleInput}
      interactive
    />
  );
}
