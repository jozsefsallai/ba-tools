module.exports = function glslLoader(source) {
  return `export default ${JSON.stringify(source)};`;
};
