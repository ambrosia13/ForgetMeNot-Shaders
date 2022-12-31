#include forgetmenot:shaders/lib/api_includes.glsl
#include forgetmenot:shaders/lib/api/fmn_pbr.glsl 
#include forgetmenot:misc


// "fast" normalize functions
vec2 fmn_fNormalize(in vec2 x) {
     float lengthSquared = dot(x, x);
     return x * inversesqrt(lengthSquared);
}
vec3 fmn_fNormalize(in vec3 x) {
     float lengthSquared = dot(x, x);
     return x * inversesqrt(lengthSquared);
}
vec4 fmn_fNormalize(in vec4 x) {
     float lengthSquared = dot(x, x);
     return x * inversesqrt(lengthSquared);
}

// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
vec2 fmn_parallaxMapping(in vec2 texcoord, in float height) {
     vec3 viewDir = fmn_fNormalize(frx_vertex.xyz) * mat3(frx_vertexTangent.xyz, cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), frx_vertexNormal.xyz);
     vec2 p = viewDir.xy / viewDir.z * (height * 1.0);
     return texcoord - p;
}

float fmn_hash12(vec2 p) {
     vec3 p3  = fract(vec3(p.xyx) * 0.1031);
     p3 += dot(p3, p3.yzx + 33.33);
     return fract((p3.x + p3.y) * p3.z);
}


float fmn_hash1D(float p) {
     p = fract(p * .1031);
     p *= p + 33.33;
     p *= p + p;
     return fract(p);
}
vec2 fmn_hash2D(float p) {
     vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
     p3 += dot(p3, p3.yzx + 33.33);
return fract((p3.xx+p3.yz)*p3.zy);
}

vec2 fmn_rotate2D(vec2 uv, float angle) {
     float s = sin(angle);
     float c = cos(angle);
     mat2 mat = mat2(c, s, -s, c);
     return mat * uv;
}

float fmn_noise2D(in vec2 st) {
     // "Value Noise" from Inigo Quilez
     // https://www.shadertoy.com/view/lsf3WH
     vec2 i = floor(st);
     vec2 f = fract(st);
          
     vec2 u = f*f*(3.0-2.0*f);

     return mix(
          mix(
               fmn_hash12(i + vec2(0.0,0.0)), 
               fmn_hash12(i + vec2(1.0,0.0)),
               u.x
          ),
          mix(
               fmn_hash12(i + vec2(0.0,1.0)), 
               fmn_hash12(i + vec2(1.0,1.0)),
               u.x
          ),
          u.y
     ) * 2.0 - 1.0;
}

// Precalculated rotation matrix to make things a tiny bit faster.
const mat2 FMN_ROTATE_30_DEGREES = mat2(
     0.99995824399, 0.00913839539,
     -0.00913839539, 0.99995824399
);


float fmn_fbm2D(vec2 uv, int octaves) {
     float noise = 0.01;
     float amp = 0.5;

     for (int i = 0; i < octaves; i++) {
          noise += amp * (fmn_noise2D(uv) * 0.5 + 0.51);
          uv = FMN_ROTATE_30_DEGREES * uv * 2.0 + mod(frx_renderSeconds / 10.0, 1000.0);
          amp *= 0.5;
     }

     return noise;
}

// Accepts a time parameter
float fmn_fbm2D(vec2 uv, int octaves, float t) {
     float noise = 0.01;
     float amp = 0.5;

     for (int i = 0; i < octaves; i++) {
          noise += amp * (fmn_noise2D(uv) * 0.5 + 0.51);
          uv = FMN_ROTATE_30_DEGREES * uv * 2.0 + mod(frx_renderSeconds * t, 1000.0);
          amp *= 0.5;
     }

     return noise;
}