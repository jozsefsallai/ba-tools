import type { Tile } from "@/app/railroad-puzzle-solver/_lib/types";

import {
  MoveDownLeftIcon,
  MoveDownRightIcon,
  MoveLeftIcon,
  MoveRightIcon,
  MoveUpLeftIcon,
  MoveUpRightIcon,
  Redo2Icon,
  RedoIcon,
  Undo2Icon,
  UndoIcon,
} from "lucide-react";

export type ResultTileArrowProps = {
  tile: Tile;
};

export function ResultTileArrow({ tile }: ResultTileArrowProps) {
  if (
    tile.state.type !== "RAIL_PIECE" &&
    tile.state.type !== "STATION_RAIL_PIECE"
  ) {
    return;
  }

  switch (tile.state.railType) {
    case "STRAIGHT":
      if (tile.state.entrance === "W" && tile.state.exit === "E") {
        return <MoveRightIcon />;
      }

      if (tile.state.entrance === "E" && tile.state.exit === "W") {
        return <MoveLeftIcon />;
      }

      if (tile.state.entrance === "NW" && tile.state.exit === "SE") {
        return <MoveDownRightIcon />;
      }

      if (tile.state.entrance === "SE" && tile.state.exit === "NW") {
        return <MoveUpLeftIcon />;
      }

      if (tile.state.entrance === "NE" && tile.state.exit === "SW") {
        return <MoveDownLeftIcon />;
      }

      if (tile.state.entrance === "SW" && tile.state.exit === "NE") {
        return <MoveUpRightIcon />;
      }

      break;
    case "SLIGHTLY_CURVED":
      if (tile.state.entrance === "W") {
        if (tile.state.exit === "NE") {
          return <UndoIcon className="rotate-[130deg]" />;
        }

        if (tile.state.exit === "SE") {
          return <RedoIcon className="rotate-[60deg]" />;
        }
      }

      if (tile.state.entrance === "E") {
        if (tile.state.exit === "NW") {
          return <RedoIcon className="rotate-[-130deg]" />;
        }

        if (tile.state.exit === "SW") {
          return <UndoIcon className="rotate-[-30deg]" />;
        }
      }

      if (tile.state.entrance === "NW") {
        if (tile.state.exit === "E") {
          return <UndoIcon className="rotate-[180deg]" />;
        }

        if (tile.state.exit === "SW") {
          return <RedoIcon className="rotate-[90deg]" />;
        }
      }

      if (tile.state.entrance === "NE") {
        if (tile.state.exit === "W") {
          return <RedoIcon className="rotate-[180deg]" />;
        }

        if (tile.state.exit === "SE") {
          return <UndoIcon className="rotate-[-130deg]" />;
        }
      }

      if (tile.state.entrance === "SE") {
        if (tile.state.exit === "W") {
          return <UndoIcon className="rotate-[30deg]" />;
        }

        if (tile.state.exit === "NE") {
          return <RedoIcon className="rotate-[-90deg]" />;
        }
      }

      if (tile.state.entrance === "SW") {
        if (tile.state.exit === "E") {
          return <RedoIcon className="rotate-[-30deg]" />;
        }

        if (tile.state.exit === "NW") {
          return <UndoIcon className="rotate-[90deg]" />;
        }
      }

      break;
    case "VERY_CURVED":
      if (tile.state.entrance === "W") {
        if (tile.state.exit === "NW") {
          return <Undo2Icon className="rotate-[60deg]" />;
        }

        if (tile.state.exit === "SW") {
          return <Redo2Icon className="rotate-[150deg]" />;
        }
      }

      if (tile.state.entrance === "E") {
        if (tile.state.exit === "NE") {
          return <Redo2Icon className="rotate-[-60deg]" />;
        }

        if (tile.state.exit === "SE") {
          return <Undo2Icon className="rotate-[-160deg]" />;
        }
      }

      if (tile.state.entrance === "NW") {
        if (tile.state.exit === "W") {
          return <Redo2Icon className="rotate-[-140deg]" />;
        }

        if (tile.state.exit === "NE") {
          return <Undo2Icon className="rotate-[90deg]" />;
        }
      }

      if (tile.state.entrance === "NE") {
        if (tile.state.exit === "E") {
          return <Undo2Icon className="rotate-[160deg]" />;
        }

        if (tile.state.exit === "NW") {
          return <Redo2Icon className="rotate-[-90deg]" />;
        }
      }

      if (tile.state.entrance === "SE") {
        if (tile.state.exit === "E") {
          return <Redo2Icon />;
        }

        if (tile.state.exit === "SW") {
          return <Undo2Icon className="rotate-[-90deg]" />;
        }
      }

      if (tile.state.entrance === "SW") {
        if (tile.state.exit === "W") {
          return <Undo2Icon />;
        }

        if (tile.state.exit === "SE") {
          return <Redo2Icon className="rotate-[90deg]" />;
        }
      }
  }
}
