const SCREENSHOT_CORS_QUERY = "1";

export function prepareCdnImagesForScreenshot(document: Document) {
  const publicCdnUrl = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;
  if (!publicCdnUrl) {
    return;
  }

  const cdnOrigin = new URL(publicCdnUrl).origin;

  for (const image of document.images) {
    const imageUrl = new URL(image.src, document.baseURI);
    if (imageUrl.origin !== cdnOrigin) {
      continue;
    }

    image.crossOrigin = "anonymous";
    imageUrl.searchParams.set("cors", SCREENSHOT_CORS_QUERY);
    image.src = imageUrl.toString();
  }
}
