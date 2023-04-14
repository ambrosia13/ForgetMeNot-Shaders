/*
#include forgetmenot:shaders/lib/inc/utility.glsl

Contains all-purpose utility functions.
*/

#define FMN_DOT_SELF (dot(x, x))
float dotSelf(in vec2 x) {
	return FMN_DOT_SELF;
}
float dotSelf(in vec3 x) {
	return FMN_DOT_SELF;
}
float dotSelf(in vec4 x) {
	return FMN_DOT_SELF;
}


// Quick clamp functions between 0 and 1
float clamp01(in float x) {
	return clamp(x, 0.0, 1.0);
}
vec2 clamp01(in vec2 x) {
	return clamp(x, vec2(0.0), vec2(1.0));
}
vec3 clamp01(in vec3 x) {
	return clamp(x, vec3(0.0), vec3(1.0));
}
vec4 clamp01(in vec4 x) {
	return clamp(x, vec4(0.0), vec4(1.0));
}

// "faster" normalize functions - probably shouldn't be used.
vec2 fNormalize(in vec2 x) {
	return x * inversesqrt(dot(x, x));
}
vec3 fNormalize(in vec3 x) {
	return x * inversesqrt(dot(x, x));
}
vec4 fNormalize(in vec4 x) {
	return x * inversesqrt(dot(x, x));
}
#define normalize(x) (fNormalize(x))

// Fast power functions
#define FMN_POW_2 (x * x)
#define FMN_POW_3 (pow2(x) * x)
#define FMN_POW_4 (pow2(x) * pow2(x))
float pow2(float x) {
	return FMN_POW_2;
}
vec2 pow2(vec2 x) {
	return FMN_POW_2;
}
vec3 pow2(vec3 x) {
	return FMN_POW_2;
}
vec4 pow2(vec4 x) {
	return FMN_POW_2;
}
float pow3(float x) {
	return FMN_POW_3;
}
vec2 pow3(vec2 x) {
	return FMN_POW_3;
}
vec3 pow3(vec3 x) {
	return FMN_POW_3;
}
vec4 pow3(vec4 x) {
	return FMN_POW_3;
}
float pow4(float x) {
	return FMN_POW_4;
}
vec2 pow4(vec2 x) {
	return FMN_POW_4;
}
vec3 pow4(vec3 x) {
	return FMN_POW_4;
}
vec4 pow4(vec4 x) {
	return FMN_POW_4;
}

#define rcp(x) (1.0 / (x))

#define FMN_LINSTEP (clamp01((x - a) * rcp(b - a)))
#define FMN_LINSTEP_FROM_ZERO (clamp01(x * rcp(b)))
float linearstep(float a, float b, float x) {
	return FMN_LINSTEP;
}
vec2 linearstep(float a, float b, vec2 x) {
	return FMN_LINSTEP;
}
vec3 linearstep(float a, float b, vec3 x) {
	return FMN_LINSTEP;
}
vec4 linearstep(float a, float b, vec4 x) {
	return FMN_LINSTEP;
}
vec2 linearstep(vec2 a, vec2 b, vec2 x) {
	return FMN_LINSTEP;
}
vec3 linearstep(vec3 a, vec3 b, vec3 x) {
	return FMN_LINSTEP;
}
vec4 linearstep(vec4 a, vec4 b, vec4 x) {
	return FMN_LINSTEP;
}
float linearstepFrom0(float b, float x) {
	return FMN_LINSTEP_FROM_ZERO;
}
vec2 linearstepFrom0(float b, vec2 x) {
	return FMN_LINSTEP_FROM_ZERO;
}
vec3 linearstepFrom0(float b, vec3 x) {
	return FMN_LINSTEP_FROM_ZERO;
}
vec4 linearstepFrom0(float b, vec4 x) {
	return FMN_LINSTEP_FROM_ZERO;
}
vec2 linearstepFrom0(vec2 b, vec2 x) {
	return FMN_LINSTEP_FROM_ZERO;
}
vec3 linearstepFrom0(vec3 b, vec3 x) {
	return FMN_LINSTEP_FROM_ZERO;
}
vec4 linearstepFrom0(vec4 b, vec4 x) {
	return FMN_LINSTEP_FROM_ZERO;
}

// Angle should be in radians
vec2 rotate2D(vec2 uv, float angle) {
	float s = sin(angle);
	float c = cos(angle);
	mat2 mat = mat2(c, s, -s, c);
	return mat * uv;
}

vec2 repeatAndMirrorCoords(vec2 uv) {
	return mix(fract(uv), 1.0 - fract(uv), mod(floor(uv), 2.0));
}

vec3 saturation(in vec3 color, in float amount) {
	return mix(vec3(frx_luminance(color)), color, amount);
}
vec3 contrast(in vec3 color, float contrast) {
	return (color - 0.5) * contrast + 0.5;
}

// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
vec2 parallaxMapping(in vec3 pos, in mat3 tbn, in vec2 texcoord, in float height) {
	vec3 viewDir = normalize(pos.xyz) * tbn;
	vec2 p = viewDir.xy / viewDir.z * (height);
	return texcoord - p;
}

const mat3 sRGBtoAP1 = mat3(
	0.613097, 0.339523, 0.047379,
	0.070194, 0.916354, 0.013452,
	0.020616, 0.109570, 0.869815
);

const mat3 AP1toSRGB = mat3(
	1.704859, -0.621715, -0.083299,
	-0.130078,  1.140734, -0.010560,
	-0.023964, -0.128975,  1.153013
);