import type { PlanaExpression } from "@/lib/plana";

const ALLOWED_EXPRESSIONS = new Set<string>([
  "idle",
  "slight_smile",
  "serious",
  "yelling",
  "worried",
  "shocked",
  "shocked_normal_halo",
  "sparkly_eyes",
  "loudly_yelling",
  "attentive",
  "sad",
  "disappointed",
  "confused",
  "embarrassed",
  "mouth_open",
  "happy",
  "loved",
  "intense_stare",
  "mad",
  "sleeping",
  "thinking",
  "closed_eyes",
]);

const EXPRESSION_ALIASES: Record<string, PlanaExpression> = {
  angry: "mad",
  annoyed: "mad",
  attentive_smile: "attentive",
  blush: "embarrassed",
  blushing: "embarrassed",
  calm: "idle",
  concerned: "worried",
  curious: "attentive",
  flustered: "embarrassed",
  neutral: "idle",
  open_mouth: "mouth_open",
  pensive: "thinking",
  smile: "slight_smile",
  smiling: "slight_smile",
  surprised: "shocked",
};

const EXPRESSION_MARKER_REGEX = /\s*\[expression:\s*([a-z_ -]+)\]\s*/gi;
const PARTIAL_EXPRESSION_MARKER_REGEX = /\s*\[expression:\s*[a-z_ -]*$/i;
const LOOSE_EXPRESSION_LINE_REGEX =
  /^\s*(?:plana\s+)?expression\s*:\s*([a-z_ -]+)\s*$/gim;
const LEGACY_TOOL_OUTPUT_REGEX =
  /\s*Function<\|\s*tool_sep\s*\|>setExpression\s*(?:```json)?\s*(\{[\s\S]*?\})\s*(?:```)?\s*/gi;
const PARTIAL_LEGACY_TOOL_OUTPUT_REGEX =
  /\s*Function<\|\s*tool_sep\s*\|>setExpression[\s\S]*$/i;

function toPlanaExpression(expression: string | undefined) {
  const normalizedExpression = expression
    ?.trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (!normalizedExpression) {
    return null;
  }

  if (ALLOWED_EXPRESSIONS.has(normalizedExpression)) {
    return normalizedExpression as PlanaExpression;
  }

  return EXPRESSION_ALIASES[normalizedExpression] ?? null;
}

export function getExpressionFromText(text: string): PlanaExpression | null {
  for (const expressionMatch of text.matchAll(EXPRESSION_MARKER_REGEX)) {
    const expression = toPlanaExpression(expressionMatch[1]);

    if (expression) {
      return expression;
    }
  }

  for (const looseExpressionMatch of text.matchAll(
    LOOSE_EXPRESSION_LINE_REGEX,
  )) {
    const expression = toPlanaExpression(looseExpressionMatch[1]);

    if (expression) {
      return expression;
    }
  }

  for (const toolOutputMatch of text.matchAll(LEGACY_TOOL_OUTPUT_REGEX)) {
    if (!toolOutputMatch[1]) {
      continue;
    }

    try {
      const output = JSON.parse(toolOutputMatch[1]) as {
        expression?: string;
      };
      const expression = toPlanaExpression(output.expression);

      if (expression) {
        return expression;
      }
    } catch {}
  }

  return null;
}

export function stripPlanaMetadata(text: string) {
  return text
    .replace(EXPRESSION_MARKER_REGEX, "")
    .replace(PARTIAL_EXPRESSION_MARKER_REGEX, "")
    .replace(LOOSE_EXPRESSION_LINE_REGEX, "")
    .replace(LEGACY_TOOL_OUTPUT_REGEX, "")
    .replace(PARTIAL_LEGACY_TOOL_OUTPUT_REGEX, "")
    .trimStart();
}
