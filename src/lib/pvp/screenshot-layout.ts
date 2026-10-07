import type { PvpPixelImage } from "@/lib/pvp";

export const PVP_REPORT_SIZE = { width: 1920, height: 820 } as const;

// Coordinates in the existing 1920px ROI coordinate system
export const PVP_REPORT_RULES = [
  { left: 51, right: 873, y: 275 },
  { left: 1046, right: 1867, y: 275 },
  { left: 51, right: 873, y: 673 },
  { left: 1046, right: 1867, y: 673 },
] as const;

export type PvpReportRule = { left: number; right: number; y: number };

export type PvpReportAlignment = {
  scale: number;
  offsetX: number;
  offsetY: number;
  rules: PvpReportRule[];
  score: number;
};

export type PvpAlignmentDiagnostics = {
  rules: PvpReportRule[];
  candidates: PvpReportAlignment[];
  imageSize?: { width: number; height: number };
  rejection?: string;
};

export class PvpScreenshotAlignmentError extends Error {
  constructor(public readonly diagnostics: PvpAlignmentDiagnostics) {
    super(
      "Could not align the PvP report. Keep both player headers, both charts, and all occupied unit portraits visible. The title and surrounding background are optional.",
    );
    this.name = "PvpScreenshotAlignmentError";
  }
}

function grayRule(image: PvpPixelImage, x: number, y: number) {
  const index = (y * image.width + x) * 4;

  const { pixels } = image;

  const r = pixels[index];
  const g = pixels[index + 1];
  const b = pixels[index + 2];

  if (
    pixels[index + 3] < 220 ||
    r < 125 ||
    Math.max(r, g, b) > 240 ||
    Math.max(r, g, b) - Math.min(r, g, b) > 24
  ) {
    return false;
  }

  const above = (Math.max(0, y - 3) * image.width + x) * 4;
  const below = (Math.min(image.height - 1, y + 3) * image.width + x) * 4;

  return Math.max(pixels[above], pixels[below]) > r + 4;
}

export function findPvpReportRules(image: PvpPixelImage): PvpReportRule[] {
  const lines: PvpReportRule[] = [];
  const minimum = Math.max(20, image.width * 0.16);

  for (let y = 3; y < image.height - 3; y++) {
    let start = -1;
    let last = -1;
    let count = 0;

    const flush = () => {
      if (
        start >= 0 &&
        last - start >= minimum &&
        count / (last - start + 1) > 0.65
      ) {
        const line = { left: start, right: last + 1, y };

        const previous = lines.find(
          (other) =>
            y - other.y <= 5 &&
            Math.abs(other.left - start) < 5 &&
            Math.abs(other.right - line.right) < 5,
        );

        if (!previous) {
          lines.push(line);
        }
      }

      start = -1;
      count = 0;
    };

    for (let x = 0; x < image.width; x++) {
      if (grayRule(image, x, y)) {
        if (start < 0) {
          start = x;
        }

        last = x;
        count++;
      } else if (start >= 0 && x - last > Math.max(3, image.width * 0.023)) {
        flush();
      }
    }

    flush();
  }

  return lines;
}

function fit(rules: PvpReportRule[]): PvpReportAlignment {
  // Least-squares fit of x/y endpoints to one scale and two translations
  const points = rules.flatMap((rule, i) => [
    {
      x: rule.left,
      y: rule.y,
      cx: PVP_REPORT_RULES[i].left,
      cy: PVP_REPORT_RULES[i].y,
    },
    {
      x: rule.right,
      y: rule.y,
      cx: PVP_REPORT_RULES[i].right,
      cy: PVP_REPORT_RULES[i].y,
    },
  ]);

  const mean = (key: keyof (typeof points)[number]) => {
    return points.reduce((sum, p) => sum + p[key], 0) / points.length;
  };

  const mx = mean("x");
  const my = mean("y");
  const cx = mean("cx");
  const cy = mean("cy");

  let numerator = 0;
  let denominator = 0;

  for (const p of points) {
    numerator += (p.x - mx) * (p.cx - cx) + (p.y - my) * (p.cy - cy);
    denominator += (p.cx - cx) ** 2 + (p.cy - cy) ** 2;
  }

  const scale = numerator / denominator;

  const offsetX = mx - scale * cx;
  const offsetY = my - scale * cy;

  const error = Math.max(
    ...points.map(
      (p) =>
        Math.hypot(
          p.x - (p.cx * scale + offsetX),
          p.y - (p.cy * scale + offsetY),
        ) / scale,
    ),
  );

  return { scale, offsetX, offsetY, rules, score: Math.max(0, 1 - error / 18) };
}

function coloredArea(
  image: PvpPixelImage,
  alignment: PvpReportAlignment,
  box: readonly [number, number, number, number],
) {
  const [x, y, width, height] = box;

  const { scale, offsetX, offsetY } = alignment;

  const left = Math.round(x * scale + offsetX);
  const top = Math.round(y * scale + offsetY);
  const right = Math.round((x + width) * scale + offsetX);
  const bottom = Math.round((y + height) * scale + offsetY);

  if (left < 0 || top < 0 || right > image.width || bottom > image.height) {
    return -1;
  }

  let colored = 0;
  let total = 0;

  for (let row = top; row < bottom; row++) {
    for (let column = left; column < right; column++) {
      const i = (row * image.width + column) * 4;

      const r = image.pixels[i];
      const g = image.pixels[i + 1];
      const b = image.pixels[i + 2];

      colored += Number(
        image.pixels[i + 3] > 220 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 35 &&
          Math.min(r, g, b) < 210,
      );

      total++;
    }
  }

  return colored / Math.max(1, total);
}

function completeContent(image: PvpPixelImage, alignment: PvpReportAlignment) {
  // Full headers (including unknown-avatar portraits) must remain in frame
  for (const box of [
    [45, 116, 830, 125],
    [1044, 116, 830, 125],
  ] as const) {
    if (coloredArea(image, alignment, box) < 0.015) {
      return false;
    }
  }

  for (const left of [46, 1044]) {
    // Check every slot's complete portrait band is visible, but allow empty
    // slots. No dependency on damage bars, their heights, or team size.
    if (coloredArea(image, alignment, [left, 681, 830, 76]) < 0.025) {
      return false;
    }
  }

  return true;
}

export function detectPvpReportAlignment(image: PvpPixelImage): {
  alignment: PvpReportAlignment;
  diagnostics: PvpAlignmentDiagnostics;
} {
  if (
    image.pixels.length !== image.width * image.height * 4 ||
    image.width < 1 ||
    image.height < 1
  ) {
    throw new PvpScreenshotAlignmentError({
      rules: [],
      candidates: [],
      rejection: "Invalid image dimensions",
    });
  }

  const rules = findPvpReportRules(image);

  const ruleWidth = PVP_REPORT_RULES[0].right - PVP_REPORT_RULES[0].left;
  const teamSpacing = PVP_REPORT_RULES[1].left - PVP_REPORT_RULES[0].left;
  const chartHeight = PVP_REPORT_RULES[2].y - PVP_REPORT_RULES[0].y;

  const pairs: [PvpReportRule, PvpReportRule][] = [];

  for (const left of rules) {
    for (const right of rules) {
      const width = left.right - left.left;

      if (
        right.left > left.right &&
        Math.abs(right.y - left.y) <= 3 &&
        Math.abs((right.right - right.left) / width - 1) < 0.035 &&
        Math.abs((right.left - left.left) / width - teamSpacing / ruleWidth) <
          0.045
      ) {
        pairs.push([left, right]);
      }
    }
  }

  const candidates: PvpReportAlignment[] = [];

  for (const upper of pairs) {
    for (const lower of pairs) {
      const scale = (upper[0].right - upper[0].left) / ruleWidth;

      if (Math.abs((lower[0].y - upper[0].y) / scale - chartHeight) > 18) {
        continue;
      }

      const candidate = fit([...upper, ...lower]);

      if (candidate.score < 0.35) {
        continue;
      }

      if (
        !candidates.some(
          (other) =>
            Math.abs(other.offsetX - candidate.offsetX) +
              Math.abs(other.offsetY - candidate.offsetY) <
            scale * 8,
        )
      ) {
        candidates.push(candidate);
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const diagnostics: PvpAlignmentDiagnostics = {
    rules,
    candidates,
    imageSize: { width: image.width, height: image.height },
  };

  const supported = candidates.filter((candidate) =>
    completeContent(image, candidate),
  );

  if (!supported.length) {
    diagnostics.rejection = candidates.length
      ? "Required headers or portraits are clipped or unrecognized"
      : "No consistent pair of chart rules found";
    throw new PvpScreenshotAlignmentError(diagnostics);
  }

  if (supported[1] && supported[0].score - supported[1].score < 0.15) {
    diagnostics.rejection = "Multiple plausible report layouts";
    throw new PvpScreenshotAlignmentError(diagnostics);
  }

  return { alignment: supported[0], diagnostics };
}

// Refine line endpoints in a small source-resoultion neighborhood
export function refinePvpReportAlignment(
  image: PvpPixelImage,
  coarse: PvpReportAlignment,
): PvpReportAlignment {
  const radius = Math.max(3, Math.ceil(coarse.scale * 6));

  const refined = coarse.rules.map((rule) => {
    let best = rule;
    let bestCount = 0;

    for (
      let y = Math.max(3, Math.round(rule.y) - radius);
      y <= Math.min(image.height - 4, Math.round(rule.y) + radius);
      y++
    ) {
      let left = image.width;
      let right = 0;

      let count = 0;

      for (
        let x = Math.max(0, Math.floor(rule.left) - radius);
        x < Math.min(image.width, rule.right + radius);
        x++
      ) {
        if (grayRule(image, x, y)) {
          left = Math.min(left, x);
          right = x + 1;
          count++;
        }
      }

      if (count > bestCount) {
        bestCount = count;
        best = { left, right, y };
      }
    }

    return best;
  });

  const alignment = fit(refined);

  if (alignment.score < 0.35 || !completeContent(image, alignment)) {
    throw new PvpScreenshotAlignmentError({
      imageSize: { width: image.width, height: image.height },
      rules: refined,
      candidates: [alignment],
      rejection: "Source-resolution landmarks failed validation",
    });
  }

  return alignment;
}
