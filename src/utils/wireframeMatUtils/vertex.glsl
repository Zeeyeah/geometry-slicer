attribute vec3 barycentric;
attribute float even;

varying vec3 vBarycentric;
varying vec3 vPosition;
varying float vEven;
varying vec2 vUv;

void main () {
  vec4 mPosition = modelMatrix * vec4( position, 1.0 );
  
  #ifdef USE_INSTANCING
    mPosition =  modelMatrix * instanceMatrix * vec4(position, 1.0);
  #endif

  gl_Position = projectionMatrix * viewMatrix * mPosition;

  vBarycentric = barycentric;
  vPosition = position.xyz;
  vEven = even;
  vUv = uv;
}
