// Source for most of this: https://github.com/tizee/gatsby-remark-b23/blob/master/src/transformer/Bilibili.ts

import type { Root, Text, Link } from "mdast";
import { visit } from "unist-util-visit";

const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 315;

export interface RemarkBilibiliPluginOptions {
  width?: number;
  height?: number;
}

function isBilibiliUrl(rawUrl: string): boolean {
  try {
    const urlString = rawUrl.toLowerCase();
    const url = new URL(urlString);

    if (
      (url.host === "b23.tv" ||
        [
          "bilibili.tv",
          "www.bilibili.tv",
          "bilibili.com",
          "www.bilibili.com",
        ].includes(url.host)) &&
      (url.pathname.includes("av") || url.pathname.includes("bv"))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function getPlayerSrc(urlStr: string): string | null {
  const url = new URL(urlStr);

  let page = url.searchParams.get("p");

  if (page && !/^[0-9]+$/.test(page)) {
    page = null;
  }

  let aid: string | undefined;

  if (/(av|Av)[0-9]+/.test(url.pathname)) {
    const group = url.pathname.match(/\/(av|AV)([0-9]+)/);

    if (!group) {
      aid = undefined;
    } else {
      aid = group[2];
    }
  }

  let bvid: string | undefined;

  if (/(BV|bv)[0-9A-Za-z]+/.test(url.pathname)) {
    const group = url.pathname.match(/\/(BV|bv)([0-9A-Za-z]+)/);

    if (!group) {
      bvid = undefined;
    } else {
      bvid = `BV${group[2]}`;
    }
  }

  const playerUrl = new URL("https://player.bilibili.com/player.html");

  playerUrl.searchParams.append("isOutside", "1");
  playerUrl.searchParams.append("autoplay", "0");

  if (bvid) {
    playerUrl.searchParams.append("bvid", bvid);

    if (page) {
      playerUrl.searchParams.append("page", page as string);
    }

    return playerUrl.toString();
  }

  if (aid) {
    playerUrl.searchParams.append("aid", aid);

    if (page) {
      playerUrl.searchParams.append("page", page as string);
    }

    return playerUrl.toString();
  }

  return null;
}

export default function remarkBilibiliPlugin(
  options?: RemarkBilibiliPluginOptions,
) {
  return (tree: Root) => {
    visit(tree, "paragraph", (node) => {
      let playerSrc: string | null = null;

      for (const child of node.children) {
        if (child.type === "text" || child.type === "link") {
          const urlStr = (child as Link)?.url ?? (child as Text)?.value;

          if (isBilibiliUrl(urlStr)) {
            playerSrc = getPlayerSrc(urlStr);

            if (playerSrc) {
              break;
            }
          }
        }
      }

      if (playerSrc) {
        const text: Text = {
          type: "text",
          value: playerSrc,
          data: {
            hName: "iframe",
            hProperties: {
              width: options?.width ?? DEFAULT_WIDTH,
              height: options?.height ?? DEFAULT_HEIGHT,
              src: playerSrc,
              frameborder: "0",
              allowfullscreen: true,
            },
            hChildren: [],
          },
        };

        node.children = [text];
      }
    });
  };
}
