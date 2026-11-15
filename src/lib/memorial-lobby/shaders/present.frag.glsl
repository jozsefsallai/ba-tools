// Encodes the frame (premultiplied linear, decoded by the GPU when sampled)
// to sRGB for the canvas; see `LinearFrame` in renderer.ts.
precision highp float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;

vec3 encode(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec4 color = texture2D(uSampler, vTextureCoord);
  vec3 rgb = color.a > 0.0 ? encode(clamp(color.rgb / color.a, 0.0, 1.0)) : vec3(0.0);
  gl_FragColor = vec4(rgb * color.a, color.a);
}
