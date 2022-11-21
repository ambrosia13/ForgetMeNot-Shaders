#include forgetmenot:shaders/lib/api_includes.glsl
#include forgetmenot:shaders/lib/api/fmn_pbr.glsl 
#include forgetmenot:debug

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
	vec2 p = floor(st);
	vec2 f = fract(st);
		
	float n = p.x + p.y*57.0;

	float a =  fmn_hash1D((n + 0.0)) * 2.0 - 1.0;
	float b =  fmn_hash1D((n + 1.0)) * 2.0 - 1.0;
	float c = fmn_hash1D((n + 57.0)) * 2.0 - 1.0;
	float d = fmn_hash1D((n + 58.0)) * 2.0 - 1.0;
	
	vec2 f2 = f * f;
	vec2 f3 = f2 * f;
	
	vec2 t = 3.0 * f2 - 2.0 * f3;
	
	float u = t.x;
	float v = t.y;

	float noise = a + (b - a) * u +(c - a) * v + (a - b + d - c) * u * v;
    // float noise = mix(a, b, f.x) + (c - a) * f.y * (1.0 - f.x) + (d - b) * f.x * f.y;

    return noise;
}

float fmn_fbm2D(vec2 uv, int octaves) {
	float noise = 0.01;
	float amp = 0.5;

    mat2 rotationMatrix = mat2(cos(PI / 6.0), sin(PI / 6.0), -sin(PI / 6.0), cos(PI / 6.0));

	for (int i = 0; i < octaves; i++) {
		noise += amp * (fmn_noise2D(uv) * 0.5 + 0.51);
		uv = rotationMatrix * uv * 2.0 + mod(frx_renderSeconds / 10.0, 1000.0);
		amp *= 0.5;
	}

    return noise;
}

// Accepts a time parameter
float fmn_fbm2D(vec2 uv, int octaves, float t) {
	float noise = 0.01;
	float amp = 0.5;

    mat2 rotationMatrix = mat2(cos(PI / 6.0), sin(PI / 6.0), -sin(PI / 6.0), cos(PI / 6.0));

	for (int i = 0; i < octaves; i++) {
		noise += amp * (fmn_noise2D(uv) * 0.5 + 0.51);
		uv = rotationMatrix * uv * 2.0 + mod(frx_renderSeconds * t, 1000.0);
		amp *= 0.5;
	}

    return noise;
}
