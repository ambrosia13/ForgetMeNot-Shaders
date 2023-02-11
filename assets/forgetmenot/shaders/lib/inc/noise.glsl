/*
#include forgetmenot:shaders/lib/inc/noise.glsl

Contains various noise functions.
*/

// --------------------------------------------------------------------------------------------------------
// Hash Without Sine from https://www.shadertoy.com/view/4djSRW
// Code released under the MIT license.
// --------------------------------------------------------------------------------------------------------
// 1 out, 2 in...
float hash12(vec2 p) {
	vec3 p3  = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}
//  1 out, 3 in...
float hash13(vec3 p3) {
	p3  = fract(p3 * 0.1031);
	p3 += dot(p3, p3.zyx + 31.32);
	return fract((p3.x + p3.y) * p3.z);
}
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// Interleaved Gradient Noise with better precision
// From LowellCamp#8190
// Slightly modified
// --------------------------------------------------------------------------------------------------------
#ifdef FRAGMENT_SHADER
	const ivec2 interleave_vec = ivec2(1125928, 97931);
	const float interleaved_z = 52.9829189;
	const float fixed2float = 1.0 / exp2(24.0);
	const int ref_fixed_point = int(exp2(24.0));

	float interleavedGradient(ivec2 seed, int t) {
		ivec2 components = ivec2(seed + 5.588238 * t) * interleave_vec;
		int internal_modulus = (components.x + components.y) & (ref_fixed_point - 1);
		return fract(float(internal_modulus) * (fixed2float * interleaved_z));
	}

	float interleavedGradient() {
		ivec2 seed = ivec2(gl_FragCoord.xy);
		int t = int(frx_renderFrames % 1000u);

		return interleavedGradient(seed, t);
	}
	float interleavedGradientStatic() {
		ivec2 seed = ivec2(gl_FragCoord.xy);
		return interleavedGradient(seed, 0);
	}

	// accepts sampleOffset parameter
	float interleavedGradient(int sampleOffset) {
		ivec2 seed = ivec2(gl_FragCoord.xy) + sampleOffset;
		int t = int(frx_renderFrames % 10000u);

		return interleavedGradient(seed, t);
	}
	float interleavedGradientStatic(int sampleOffset) {
		ivec2 seed = ivec2(gl_FragCoord.xy) + sampleOffset;
		return interleavedGradient(seed, 0);
	}
#endif
// --------------------------------------------------------------------------------------------------------

// Credit goes to Belmu#4066 for helping me solve my shadow sampling issues through the following two functions.
vec2 sincos(float x) {
	return vec2(sin(x), cos(x));
}
vec2 diskSampling(float i, float n, float phi) {
	float theta = (i + phi) / n; 
	return sincos(theta * TAU * n * 1.618033988749894) * theta;
}

// Provided by Belmu.
// Noise distribution: https://www.pcg-random.org/
void pcg(inout uint seed) {
	uint state = seed * 747796405u + 2891336453u;
	uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	seed = (word >> 22u) ^ word;
}

#ifdef FRAGMENT_SHADER
	uint rngState = 185730u * frx_renderFrames + uint(gl_FragCoord.x + gl_FragCoord.y * frxu_size.x);

	float randF() { 
		pcg(rngState); 
		return float(rngState) / float(0xffffffffu); 
	}

	// From Jessie
	vec3 generateUnitVector(vec2 xy) {
		xy.x *= TAU; xy.y = 2.0 * xy.y - 1.0;
		return vec3(sincos(xy.x) * sqrt(1.0 - xy.y * xy.y), xy.y);
	}

	vec3 generateCosineVector(vec3 vector, vec2 xy) {
		return normalize(vector + generateUnitVector(xy));
	}
	// -----------------------------------------------------------------------------------------------

	vec3 generateCosineVector(vec3 vector, float roughness) {
		return normalize(
			vector + 
			roughness * generateUnitVector(
				vec2(
					randF(), randF()
				)
			)
		);
	}
	vec3 generateCosineVector(vec3 vector) {
		return generateCosineVector(vector, 1.0);
	}
#endif

// Smooth noise function
float smoothHash(in vec2 st) {
	// "Value Noise" from Inigo Quilez
	// https://www.shadertoy.com/view/lsf3WH
	vec2 i = (floor(st));
	vec2 f = fract(st);
		
	vec2 u = f * f * (3.0 - 2.0 * f);

	return mix(
		mix(
			hash12(i + vec2(0.0,0.0)), 
			hash12(i + vec2(1.0,0.0)),
			u.x
		),
		mix(
			hash12(i + vec2(0.0,1.0)), 
			hash12(i + vec2(1.0,1.0)),
			u.x
		),
		u.y
	);
}

// Precalculated rotation matrix to make things a tiny bit faster.
const mat2 ROTATE_30_DEGREES = mat2(
	0.99995824399, 0.00913839539,
	-0.00913839539, 0.99995824399
);

// 2D FBM Hash
float fbmHash(vec2 uv, int octaves, float lacunarity, float t) {
	float noise = 0.01;
	float amp = 0.5;

	for (int i = 0; i < octaves; i++) {
		noise += amp * (smoothHash(uv));
		uv = ROTATE_30_DEGREES * uv * lacunarity + mod(frx_renderSeconds * t, 1000.0);
		amp *= 0.5;
	}

	return noise * (octaves + 1.0) / octaves;
}
float fbmHash(vec2 uv, int octaves, float t) {
	return fbmHash(uv, octaves, 2.0, t);
}
float fbmHash(vec2 uv, int octaves) {
	return fbmHash(uv, octaves, 0.0);
}

// 3D FBM Hash
float fbm3d(vec3 uv, int octaves, float lacunarity, float t) {
	float noise = 0.01;
	float amp = 0.5;

	for (int i = 0; i < octaves; i++) {
		noise += amp * (snoise(uv) * 0.5 + 0.5);
		uv = uv * lacunarity + mod(frx_renderSeconds * t, 1000.0);
		amp *= 0.5;
	}

	return noise * (octaves + 1.0) / octaves;
}
float fbm3d(vec3 uv, int octaves, float t) {
	return fbm3d(uv, octaves, 2.0, t);
}
float fbm3d(vec3 uv, int octaves) {
	return fbm3d(uv, octaves, 0.0);
}
