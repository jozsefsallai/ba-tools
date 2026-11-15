// Multiplies the light overlays by the alpha of their mask shapes; see
// `AlphaMaskFilter` in renderer.ts.
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D uMask;

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord) * texture2D(uMask, vTextureCoord).a;
}
