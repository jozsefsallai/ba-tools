module.exports = function ogAssetLoader(source) {
  const mime = this.resourcePath.endsWith(".png")
    ? "image/png"
    : this.resourcePath.endsWith(".svg")
      ? "image/svg+xml"
      : "application/octet-stream";

  return `export default ${JSON.stringify(`data:${mime};base64,${source.toString("base64")}`)};`;
};

module.exports.raw = true;
