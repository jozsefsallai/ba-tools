export function prepareCdnImagesForScreenshot(document: Document) {
  const publicCdnUrl = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;
  if (!publicCdnUrl) {
    return;
  }

  const cdnOrigin = new URL(publicCdnUrl).origin;

  const timestamp = Date.now();

  for (const image of document.images) {
    const imageUrl = new URL(image.src, document.baseURI);
    if (imageUrl.origin !== cdnOrigin) {
      continue;
    }

    image.crossOrigin = "anonymous";
    imageUrl.searchParams.set("ts", timestamp.toString());
    image.src = imageUrl.toString();
  }
}
