import type { PvpPixelImage } from "@/lib/pvp";

export function drawPvpPixels(canvas: HTMLCanvasElement, image: PvpPixelImage) {
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  canvas.width = image.width;
  canvas.height = image.height;

  const data = context.createImageData(image.width, image.height);
  data.data.set(image.pixels);

  context.putImageData(data, 0, 0);

  return context;
}

export function drawPvpCrop(
  canvas: HTMLCanvasElement,
  image: PvpPixelImage,
  scale = 1,
  padding = 0,
) {
  const source = document.createElement("canvas");
  const sourceContext = drawPvpPixels(source, image);
  const context = canvas.getContext("2d");

  if (!sourceContext || !context) {
    throw new Error("Canvas rendering unavailable");
  }

  canvas.width = image.width * scale + padding * 2;
  canvas.height = image.height * scale + padding * 2;

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    source,
    padding,
    padding,
    image.width * scale,
    image.height * scale,
  );
}
