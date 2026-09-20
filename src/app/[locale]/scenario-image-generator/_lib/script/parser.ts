export type ScenarioScriptCommand =
  | { type: "CHARA_CREATE"; id: string }
  | { type: "CHARA_SPRITE"; id: string; expression: string; url: string }
  | { type: "FADE_IN"; time: number }
  | { type: "FADE_OUT"; time: number }
  | {
      type: "CHARA_SET";
      id: string;
      x?: number;
      y?: number;
      scale?: number;
      darken?: boolean;
      hologram?: boolean;
    }
  | { type: "CHARA_FADE_IN"; id: string; time: number }
  | { type: "WAIT"; time: number }
  | { type: "NAME"; name: string }
  | { type: "AFFILIATION"; affiliation: string }
  | { type: "CLEAR_NAME" }
  | { type: "CLEAR_AFFILIATION" }
  | { type: "CHARA_EXPR"; id: string; expression: string }
  | { type: "CHARA_MOVE"; id: string; x?: number; y?: number; time?: number }
  | { type: "INPUT" }
  | { type: "CLEAR_MESSAGE" }
  | { type: "MESSAGE"; message: string };

export type ScenarioScriptEvent = {
  id: string;
  commands: ScenarioScriptCommand[];
};

export type ScenarioScriptParseError = {
  line: number;
  message: string;
};

export type ScenarioScriptParseResult = {
  events: ScenarioScriptEvent[];
  errors: ScenarioScriptParseError[];
};

function parseTimeArgument(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }

  const value = raw.startsWith("time:")
    ? Number.parseInt(raw.slice(5), 10)
    : Number.parseInt(raw, 10);

  return Number.isNaN(value) ? undefined : value;
}

export function parseScenarioScript(script: string): ScenarioScriptParseResult {
  const events: ScenarioScriptEvent[] = [];
  const errors: ScenarioScriptParseError[] = [];

  let current: ScenarioScriptEvent | null = null;

  const lines = script.split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineNumber = lineIndex + 1;
    const trimmedLine = lines[lineIndex].trim();

    if (!trimmedLine) {
      if (current) {
        events.push(current);
        current = null;
      }

      continue;
    }

    if (trimmedLine.startsWith("#")) {
      if (current) {
        events.push(current);
      }

      current = {
        id: trimmedLine.slice(1).trim(),
        commands: [],
      };

      continue;
    }

    if (!current) {
      errors.push({
        line: lineNumber,
        message: "No event to attach command to. Start one with #<id>.",
      });
      continue;
    }

    const parts = trimmedLine.split(" ");
    const rawCommand = parts[0];

    switch (rawCommand) {
      case "CHARA_CREATE": {
        const id = parts[1];

        if (!id) {
          errors.push({
            line: lineNumber,
            message: "CHARA_CREATE command requires an ID.",
          });
          break;
        }

        current.commands.push({ type: "CHARA_CREATE", id });
        break;
      }

      case "CHARA_SPRITE": {
        const id = parts[1];
        const expression = parts[2];
        const url = parts.slice(3).join(" ");

        if (!id || !expression || !url) {
          errors.push({
            line: lineNumber,
            message:
              "CHARA_SPRITE command requires an ID, an expression, and a URL.",
          });
          break;
        }

        current.commands.push({ type: "CHARA_SPRITE", id, expression, url });
        break;
      }

      case "FADE_IN":
      case "FADE_OUT": {
        current.commands.push({
          type: rawCommand,
          time: parseTimeArgument(parts[1]) ?? 1000,
        });
        break;
      }

      case "CHARA_SET": {
        const id = parts[1];

        if (!id) {
          errors.push({
            line: lineNumber,
            message: "CHARA_SET command requires an ID.",
          });
          break;
        }

        const command: ScenarioScriptCommand = { type: "CHARA_SET", id };

        for (let i = 2; i < parts.length; i++) {
          const part = parts[i];
          if (part.startsWith("x:")) {
            command.x = Number.parseFloat(part.slice(2));
          } else if (part.startsWith("y:")) {
            command.y = Number.parseFloat(part.slice(2));
          } else if (part.startsWith("scale:")) {
            command.scale = Number.parseFloat(part.slice(6));
          } else if (part.startsWith("darken:")) {
            command.darken = part === "darken:true" || part === "darken:1";
          } else if (part.startsWith("hologram:")) {
            command.hologram =
              part === "hologram:true" || part === "hologram:1";
          }
        }

        current.commands.push(command);
        break;
      }

      case "CHARA_FADE_IN": {
        const id = parts[1];

        if (!id) {
          errors.push({
            line: lineNumber,
            message: "CHARA_FADE_IN command requires an ID.",
          });
          break;
        }

        current.commands.push({
          type: "CHARA_FADE_IN",
          id,
          time: parseTimeArgument(parts[2]) ?? 1000,
        });
        break;
      }

      case "WAIT": {
        const time = Number.parseInt(parts[1], 10);

        if (Number.isNaN(time)) {
          errors.push({
            line: lineNumber,
            message: "WAIT command requires a valid time in milliseconds.",
          });
          break;
        }

        current.commands.push({ type: "WAIT", time });
        break;
      }

      case "NAME": {
        const name = parts.slice(1).join(" ");

        if (!name) {
          errors.push({
            line: lineNumber,
            message: "NAME command requires a name.",
          });
          break;
        }

        current.commands.push({ type: "NAME", name });
        break;
      }

      case "AFFILIATION": {
        const affiliation = parts.slice(1).join(" ");

        if (!affiliation) {
          errors.push({
            line: lineNumber,
            message: "AFFILIATION command requires an affiliation.",
          });
          break;
        }

        current.commands.push({ type: "AFFILIATION", affiliation });
        break;
      }

      case "CLEAR_NAME": {
        current.commands.push({ type: "CLEAR_NAME" });
        break;
      }

      case "CLEAR_AFFILIATION": {
        current.commands.push({ type: "CLEAR_AFFILIATION" });
        break;
      }

      case "CHARA_EXPR": {
        const id = parts[1];
        const expression = parts.slice(2).join(" ");

        if (!id || !expression) {
          errors.push({
            line: lineNumber,
            message: "CHARA_EXPR command requires an ID and an expression.",
          });
          break;
        }

        current.commands.push({ type: "CHARA_EXPR", id, expression });
        break;
      }

      case "CHARA_MOVE": {
        const id = parts[1];

        if (!id) {
          errors.push({
            line: lineNumber,
            message: "CHARA_MOVE command requires an ID.",
          });
          break;
        }

        const command: ScenarioScriptCommand = { type: "CHARA_MOVE", id };

        for (let i = 2; i < parts.length; i++) {
          const part = parts[i];
          if (part.startsWith("x:")) {
            command.x = Number.parseFloat(part.slice(2));
          } else if (part.startsWith("y:")) {
            command.y = Number.parseFloat(part.slice(2));
          } else if (part.startsWith("time:")) {
            command.time = Number.parseInt(part.slice(5), 10);
          }
        }

        current.commands.push(command);
        break;
      }

      case "INPUT": {
        current.commands.push({ type: "INPUT" });
        break;
      }

      case "CLEAR_MESSAGE": {
        current.commands.push({ type: "CLEAR_MESSAGE" });
        break;
      }

      default: {
        // any non-command line is treated as dialogue
        current.commands.push({ type: "MESSAGE", message: trimmedLine });
        break;
      }
    }
  }

  if (current) {
    events.push(current);
  }

  return { events, errors };
}
