// Vertex shader for lobby effects: positions come already projected into the
// mesh's parent (the scene, or the skeleton container it's drawn inside of).
precision highp float;

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec4 aColor;
attribute vec4 aCustom;
uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
varying vec2 vUv;
varying vec4 vColor;
varying vec4 vCustom;

void main() {
  gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
  vUv = aTextureCoord;
  vColor = aColor;
  vCustom = aCustom;
}
