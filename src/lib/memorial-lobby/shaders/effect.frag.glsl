// Fragment shader for lobby effects; see `materialSetup` in effects.ts for
// how each material's properties map onto these uniforms.
// UVs are in Unity's convention (v up); textures are stored top row first.
precision highp float;

varying vec2 vUv;
varying vec4 vColor;
varying vec4 vCustom;

uniform sampler2D uMain;
uniform sampler2D uMask;
uniform sampler2D uDistort;
uniform vec4 uMainST;
uniform vec4 uMaskST;
uniform vec4 uDistortST;
uniform vec2 uMainSpeed;
uniform vec2 uMaskSpeed;
uniform vec2 uDistortSpeed;
uniform vec2 uDistortPower;
uniform vec4 uTint;
uniform float uFamily;
uniform float uCover;
uniform float uMainOpaque;
uniform float uMaskOpaque;
uniform float uDissolve;
uniform float uDissolveSoftness;
uniform float uSmokeBlur;
uniform float uRedShading;
uniform float uTime;
uniform float uHasMain;
uniform float uHasMask;
uniform float uHasDistort;
uniform float uDistortMain;
uniform float uDistortMask;
uniform float uCustomData;
uniform float uVertexAlpha;

vec4 fetch(sampler2D tex, vec2 uv) {
  return texture2D(tex, vec2(uv.x, 1.0 - uv.y));
}

void main() {
  vec2 offset = vec2(0.0);

  if (uHasDistort > 0.5) {
    vec4 d = fetch(uDistort, vUv * uDistortST.xy + uDistortST.zw + uDistortSpeed * uTime);
    offset = (d.r - 0.5) * uDistortPower;
  }

  vec2 mainOffset = uCustomData > 1.5 ? vec2(vCustom.x, 0.0) : uCustomData > 0.5 ? vCustom.xy : vec2(0.0);
  vec2 maskOffset = uCustomData > 1.5 ? vec2(vCustom.y, 0.0) : vec2(0.0);
  vec2 mainUv = vUv * uMainST.xy + uMainST.zw + uMainSpeed * uTime + mainOffset;

  if (uDistortMain > 0.5) {
    mainUv += offset;
  }

  vec4 tex = uHasMain > 0.5 ? fetch(uMain, mainUv) : vec4(1.0);
  float dissolveMap = tex.b;

  if (uRedShading > 0.5) {
    tex.rgb = vec3(tex.r);
  }

  // Textures without alpha are opaque where they're bright.
  float coverage = uMainOpaque > 0.5 ? max(tex.r, max(tex.g, tex.b)) : tex.a;
  float shape = coverage;

  if (uHasMask > 0.5) {
    vec2 maskUv = vUv * uMaskST.xy + uMaskST.zw + uMaskSpeed * uTime + maskOffset;
    if (uDistortMask > 0.5) {
      maskUv += offset;
    }

    vec4 mask = fetch(uMask, maskUv);
    shape = uMaskOpaque > 0.5 ? max(mask.r, max(mask.g, mask.b)) : mask.a;
    coverage *= shape;
  }

  if (uDissolve > 2.5) {
    // Smoke: the blue channel is each puff's soft density. As the custom
    // data's 4th value climbs over the puff's life (from about half to 1),
    // the density is remapped down to nothing: thin parts thin out first and
    // the puff shrinks away smoothly instead of being cut. The particle's
    // alpha fades it overall.
    //
    // The shader blurs the smoke (its name says Blur): average the
    // density and mask over three rings of eight samples around the pixel,
    // weighted like a Gaussian, so puffs melt into each other.

    vec2 soft = vec2(dissolveMap, tex.a);
    float weight = 1.0;

    for (int ring = 1; ring <= 3; ring++) {
      float r = float(ring) / 3.0;
      float w = exp(-r * r * 2.0);

      for (int k = 0; k < 8; k++) {
        float angle = float(k) * 0.7854 + float(ring) * 0.3927;
        vec4 tap = fetch(uMain, mainUv + uSmokeBlur * r * vec2(cos(angle), sin(angle)));
        soft += vec2(tap.b, tap.a) * w;
        weight += w;
      }
    }

    soft /= weight;
    float threshold = clamp((vCustom.w - 0.5) * 2.0, 0.0, 1.0);
    float density = clamp((soft.x - threshold) / max(1.0 - threshold, 0.001), 0.0, 1.0);
    coverage = soft.y * density * vColor.a;
  } else if (uDissolve > 1.5) {
    // Fades with the particle's alpha and burns away as it does: the
    // threshold (1 − alpha) erases its thin parts first. A wide edge keeps
    // it a soft veil rather than hard-edged blobs.
    float threshold = 1.0 - vColor.a;
    coverage *= vColor.a * smoothstep(threshold - 0.5, threshold + 0.5, shape);
  } else if (uDissolve > 0.5) {
    float threshold = vCustom.w;
    coverage *= smoothstep(threshold, threshold + uDissolveSoftness, shape);
  }

  // The game works in linear light: textures and particle colors are
  // decoded, multiplied by the HDR tint and blended. The canvas blends sRGB
  // values, so each effect's color goes back to sRGB first, which matches
  // linear blending over the dark backgrounds effects mostly sit on.
  vec3 linear = pow(tex.rgb, vec3(2.2)) * pow(vColor.rgb, vec3(2.2)) * uTint.rgb;

  // HDR tints push colors past 1. The game renders in HDR, so rather than
  // clipping them to white, roll the brightest channel off smoothly towards
  // 1 and scale the others along, keeping the hue (e.g. S.Mika's halo).
  float peak = max(linear.r, max(linear.g, linear.b));
  float knee = 0.6;
  float rolled = peak <= knee ? peak : knee + (1.0 - knee) * (1.0 - exp(-(peak - knee) / (1.0 - knee)));

  vec3 rgb = pow(peak > 0.0 ? linear * (rolled / peak) : linear, vec3(1.0 / 2.2));

  float alpha = coverage * mix(1.0, vColor.a, uVertexAlpha) * uTint.a;

  if (uFamily < 0.5) {
    gl_FragColor = vec4(rgb * alpha, 0.0);
  } else if (uFamily < 1.5) {
    gl_FragColor = vec4(rgb * coverage, alpha * uCover);
  } else {
    gl_FragColor = vec4(rgb * alpha, alpha);
  }
}
