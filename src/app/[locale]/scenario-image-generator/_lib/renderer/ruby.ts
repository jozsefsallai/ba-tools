import { CanvasTextMetrics, type TextStyle } from "pixi.js";

const RUBY_REGEX = /\[ruby=([^\]]*)\]([\s\S]*?)\[\/ruby\]/g;

const BREAKING_SPACE_REGEX = /[\t  -  -  　]/g;

const RUBY_OVERLAP_RATIO = 0.09;

const LATIN_REFERENCE_GLYPH = "H";
const CJK_REFERENCE_GLYPH = "国";
const CJK_REGEX = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/;

let measureContext: CanvasRenderingContext2D | null = null;

function measureGlyphAscent(text: string, style: TextStyle): number {
  if (!measureContext) {
    measureContext = document.createElement("canvas").getContext("2d");
  }

  if (!measureContext) {
    return style.fontSize * 0.75;
  }

  measureContext.font = style._fontString;
  return measureContext.measureText(text).actualBoundingBoxAscent;
}

export type RubyAnnotation = {
  start: number;
  base: string;
  ruby: string;
};

export type ParsedRubyText = {
  text: string;
  annotations: RubyAnnotation[];
};

export type RubyPlacement = {
  ruby: string;
  x: number;
  y: number;
  lineIndex: number;
  revealAt: number;
};

export function parseRubyMarkup(content: string): ParsedRubyText {
  const annotations: RubyAnnotation[] = [];
  let text = "";
  let lastIndex = 0;

  for (const match of content.matchAll(RUBY_REGEX)) {
    const [full, ruby, rawBase] = match;
    const base = rawBase.replace(BREAKING_SPACE_REGEX, " ");

    text += content.slice(lastIndex, match.index);

    if (ruby.trim() && base) {
      annotations.push({ start: text.length, base, ruby: ruby.trim() });
    }

    text += base;
    lastIndex = match.index + full.length;
  }

  text += content.slice(lastIndex);

  return { text, annotations };
}

function measureWidth(text: string, style: TextStyle): number {
  if (!text) {
    return 0;
  }

  return CanvasTextMetrics.measureText(text, style, undefined, false)
    .lineWidths[0];
}

export function layoutRuby(
  text: string,
  annotations: RubyAnnotation[],
  style: TextStyle,
): RubyPlacement[] {
  if (annotations.length === 0) {
    return [];
  }

  const metrics = CanvasTextMetrics.measureText(text, style);
  const { lines, lineHeight, fontProperties } = metrics;
  const halfStroke = (style._stroke?.width ?? 0) / 2;
  const lineShift = Math.max(0, (lineHeight - fontProperties.fontSize) / 2);

  const lineOffsets: number[] = [];

  let cursor = 0;

  for (const line of lines) {
    const offset = text.indexOf(line, cursor);
    const resolved = offset < 0 ? cursor : offset;
    lineOffsets.push(resolved);
    cursor = resolved + line.length;
  }

  const placements: RubyPlacement[] = [];

  for (const annotation of annotations) {
    let lineIndex = -1;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (lineOffsets[i] <= annotation.start) {
        lineIndex = i;
        break;
      }
    }

    if (lineIndex < 0) {
      continue;
    }

    const line = lines[lineIndex];
    const column = annotation.start - lineOffsets[lineIndex];

    if (column > line.length) {
      continue;
    }

    let revealAt = column;

    for (let i = 0; i < lineIndex; i++) {
      revealAt += lines[i].length;
    }

    const prefixWidth = measureWidth(line.slice(0, column), style);
    const baseWidth = measureWidth(annotation.base, style);
    const baseline = halfStroke + fontProperties.ascent + lineShift;

    placements.push({
      ruby: annotation.ruby,
      x: halfStroke + prefixWidth + baseWidth / 2,
      y:
        baseline -
        measureGlyphAscent(
          CJK_REGEX.test(annotation.base)
            ? CJK_REFERENCE_GLYPH
            : LATIN_REFERENCE_GLYPH,
          style,
        ) +
        style.fontSize * RUBY_OVERLAP_RATIO,
      lineIndex,
      revealAt,
    });
  }

  return placements;
}
