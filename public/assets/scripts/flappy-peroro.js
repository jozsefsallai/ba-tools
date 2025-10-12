const GAME_BASE_URL = "https://cdn.nimblebun.works/webgame/flappyperoro";

const loader = document.createElement("script");
loader.src = `${GAME_BASE_URL}/Build/peroro.loader.js`;
loader.addEventListener("load", () => {
  createUnityInstance(document.querySelector("#unity-canvas"), {
    arguments: [],
    dataUrl: `${GAME_BASE_URL}/Build/peroro.data.unityweb`,
    frameworkUrl: `${GAME_BASE_URL}/Build/peroro.framework.js.unityweb`,
    codeUrl: `${GAME_BASE_URL}/Build/peroro.wasm.unityweb`,
    streamingAssetsUrl: "StreamingAssets",
    companyName: "Nimble Bun Works",
    productName: "FlappyPeroro",
    productVersion: "1.0.0",
  }).catch((message) => {
    console.error(message);
    alert("Failed to load game. Check browser console for more info.");
  });
});

document.body.appendChild(loader);
