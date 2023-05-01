/*
#include forgetmenot:shaders/lib/inc/noise.glsl

Contains various noise functions.
*/

#include frex:shaders/lib/noise/cellular2x2.glsl

// --------------------------------------------------------------------------------------------------------
// Hash Without Sine from https://www.shadertoy.com/view/4djSRW
// Code released under the MIT license.
// --------------------------------------------------------------------------------------------------------
// 2 out, 2 in...
vec2 hash22(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx+33.33);
	return fract((p3.xx+p3.yz)*p3.zy);
}

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

//  2 out, 1 in...
vec2 hash21(float p) {
	vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.xx+p3.yz)*p3.zy);
}

//  3 out, 1 in...
vec3 hash31(float p) {
	vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx+33.33);
	return fract((p3.xxy+p3.yzz)*p3.zyx); 
}

//  3 out, 2 in...
vec3 hash32(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yxz+33.33);
	return fract((p3.xxy+p3.yzz)*p3.zyx);
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

// Precalculated rotation matrix to make things a tiny bit faster.
const mat2 ROTATE_30_DEGREES = mat2(
	0.99995824399, 0.00913839539,
	-0.00913839539, 0.99995824399
);

// 2D noise
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
vec2 curlNoise(in vec2 st) {
	const float eps = 1e-3;

	float centerNoise = smoothHash(st);
	float noiseUp = smoothHash(st + vec2(st.x, st.y + eps));
	float noiseRight = smoothHash(st + vec2(st.x + eps, st.y));

	float dx = (noiseUp - centerNoise) / eps;
	float dy = (noiseRight - centerNoise) / eps;

	return vec2(dx, dy);
}

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


float fbmCellular(vec2 uv, int octaves, float lacunarity, float t) {
	float noise = 0.01;
	float amp = 0.5;

	for (int i = 0; i < octaves; i++) {
		noise += amp * (1.0 - cellular2x2(uv).x);
		uv = ROTATE_30_DEGREES * uv * lacunarity + mod(frx_renderSeconds * t, 1000.0);
		amp *= 0.5;
	}

	return noise * (octaves + 1.0) / octaves;
}
float fbmCellular(vec2 uv, int octaves, float t) {
	return fbmCellular(uv, octaves, 2.0, t);
}
float fbmCellular(vec2 uv, int octaves) {
	return fbmCellular(uv, octaves, 0.0);
}

// 3D noise
float smoothHash(in vec3 st) {
	// "Value Noise" from Inigo Quilez, modified
	// https://www.shadertoy.com/view/lsf3WH
	vec3 i = (floor(st));
	vec3 f = fract(st);
		
	vec3 u = f * f * (3.0 - 2.0 * f);

	return mix(
		mix(
			mix(
				hash13(i + vec3(0.0, 0.0, 0.0)),
				hash13(i + vec3(1.0, 0.0, 0.0)),
				u.x
			),
			mix(
				hash13(i + vec3(0.0, 1.0, 0.0)),
				hash13(i + vec3(1.0, 1.0, 0.0)),
				u.x
			),
			u.y
		),
		mix(
			mix(
				hash13(i + vec3(0.0, 0.0, 1.0)),
				hash13(i + vec3(1.0, 0.0, 1.0)),
				u.x
			),
			mix(
				hash13(i + vec3(0.0, 1.0, 1.0)),
				hash13(i + vec3(1.0, 1.0, 1.0)),
				u.x
			),
			u.y
		),
		u.z
	);
}

float fbmHash3DBlocky(vec3 uv, int octaves, float lacunarity, float t) {
	float noise = 0.01;
	float amp = 0.5;

	for (int i = 0; i < octaves; i++) {
		noise += amp * (hash13(floor(uv * 2.0) / 2.0));
		uv = 10.0 + uv * lacunarity + mod(frx_renderSeconds * t, 1000.0);
		amp *= 0.5;
	}

	return noise * (octaves + 1.0) / octaves;
}

float fbmHash3D(vec3 uv, int octaves, float lacunarity, float t) {
	float noise = 0.01;
	float amp = 0.5;

	for (int i = 0; i < octaves; i++) {
		noise += amp * (smoothHash(uv));
		uv = 10.0 + uv * lacunarity + mod(frx_renderSeconds * t, 1000.0);
		amp *= 0.5;
	}

	return noise * (octaves + 1.0) / octaves;
}
float fbmHash3D(vec3 uv, int octaves, float t) {
	return fbmHash3D(uv, octaves, 2.0, t);
}
float fbmHash3D(vec3 uv, int octaves) {
	return fbmHash3D(uv, octaves, 0.0);
}

// Derivative noise
// Based on https://www.shadertoy.com/view/XdXBRH by Inigo Quilez
vec2 hashDXY(in vec2 x) {
    const vec2 k = vec2(0.3183099, 0.3678794);
    x = x * k + k.yx;
    return -1.0 + 2.0 * fract(16.0 * k * fract(x.x * x.y * (x.x + x.y)));
}

vec2 smoothHashDXY(in vec2 st) {
	vec2 i = floor(st);
	vec2 f = fract(st);

	// quintic interpolation
	vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
	vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
	
	vec2 ga = hashDXY(i + vec2(0.0, 0.0));
	vec2 gb = hashDXY(i + vec2(1.0, 0.0));
	vec2 gc = hashDXY(i + vec2(0.0, 1.0));
	vec2 gd = hashDXY(i + vec2(1.0, 1.0));
	
	float va = dot(ga, f - vec2(0.0, 0.0));
	float vb = dot(gb, f - vec2(1.0, 0.0));
	float vc = dot(gc, f - vec2(0.0, 1.0));
	float vd = dot(gd, f - vec2(1.0, 1.0));

	return vec2(
		ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) +
		du * (u.yx * (va - vb - vc + vd) + vec2(vb, vc) - va)
	);
}

vec2 fbmDXY(in vec2 uv, int octaves, float lacunarity, float t) {
	vec2 noise = vec2(0.0);
	float amp = 0.5;

	for (int i = 0; i < octaves; i++) {
		noise += amp * (smoothHashDXY(uv));
		uv = 10.0 + rotate2D(uv, 0.5) * lacunarity + mod(frx_renderSeconds * t, 1000.0);
		amp *= 0.5;
	}

	return noise * (octaves + 1.0) / octaves;
}
vec2 fbmDXY(in vec2 uv, int octaves, float t) {
	return fbmDXY(uv, octaves, 2.0, t);
}
vec2 fbmDXY(in vec2 uv, int octaves) {
	return fbmDXY(uv, octaves, 0.0);
}