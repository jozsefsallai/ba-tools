export function hexToRgba(hexColor: string, opacityPercent: number): string {
  const hex = hexColor.replace("#", "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const a = Math.min(100, Math.max(0, opacityPercent)) / 100;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function compositeCanvasBackground(
  canvas: HTMLCanvasElement,
  hexColor: string,
  opacityPercent: number,
): HTMLCanvasElement {
  const output = document.createElement("canvas");
  output.width = canvas.width;
  output.height = canvas.height;

  const ctx = output.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  ctx.fillStyle = hexToRgba(hexColor, opacityPercent);
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.drawImage(canvas, 0, 0);

  return output;
}

// adapted from https://gist.github.com/remy/784508
export function trimTransparentPixels(
  canvas: HTMLCanvasElement,
): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  const clone = document.createElement("canvas").getContext("2d");

  if (!ctx || !clone) {
    return canvas;
  }

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const length = pixels.data.length;

  const bounds = {
    top: null as number | null,
    bottom: null as number | null,
    left: null as number | null,
    right: null as number | null,
  };

  for (let i = 0; i < length; i += 4) {
    if (pixels.data[i + 3] <= 0) {
      continue;
    }

    const x = (i / 4) % canvas.width;
    const y = ~~(i / 4 / canvas.width);

    if (bounds.top === null) {
      bounds.top = y;
    }

    if (bounds.left === null) {
      bounds.left = x;
    } else if (x < bounds.left) {
      bounds.left = x;
    }

    if (bounds.right === null) {
      bounds.right = x;
    } else if (x > bounds.right) {
      bounds.right = x;
    }

    if (bounds.bottom === null) {
      bounds.bottom = y;
    } else if (y > bounds.bottom) {
      bounds.bottom = y;
    }
  }

  if (
    bounds.top === null ||
    bounds.bottom === null ||
    bounds.left === null ||
    bounds.right === null
  ) {
    return canvas;
  }

  const trimmedHeight = bounds.bottom - bounds.top + 1;
  const trimmedWidth = bounds.right - bounds.left + 1;

  const trimmed = ctx.getImageData(
    bounds.left,
    bounds.top,
    trimmedWidth,
    trimmedHeight,
  );
  clone.canvas.width = trimmedWidth;
  clone.canvas.height = trimmedHeight;
  clone.putImageData(trimmed, 0, 0);

  return clone.canvas;
}
