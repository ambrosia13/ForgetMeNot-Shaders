#include forgetmenot:shaders/lib/functions/external.glsl 

// Space conversions
vec3 setupViewSpacePos(in vec2 texcoord, in float depth) {
    vec3 screenSpacePos = vec3(texcoord, depth);
    vec3 clipSpacePos = screenSpacePos * 2.0 - 1.0;
    vec4 temp = frx_inverseViewProjectionMatrix * vec4(clipSpacePos, 1.0);
    return temp.xyz / temp.w;
}
vec3 viewSpaceToScreenSpace(in vec3 viewSpacePos) {
    vec4 temp = frx_viewProjectionMatrix * vec4(viewSpacePos, 1.0);
    return (temp.xyz / temp.w) * 0.5 + 0.5;
}
vec3 setupCleanViewSpacePos(in vec2 texcoord, in float depth) {
    vec3 screenSpacePos = vec3(texcoord, depth);
    vec3 clipSpacePos = screenSpacePos * 2.0 - 1.0;
    vec4 temp = frx_inverseCleanViewProjectionMatrix * vec4(clipSpacePos, 1.0);
    return temp.xyz / temp.w;
}
vec3 cleanViewSpaceToScreenSpace(in vec3 viewSpacePos) {
    vec4 temp = frx_cleanViewProjectionMatrix * vec4(viewSpacePos, 1.0);
    return (temp.xyz / temp.w) * 0.5 + 0.5;
}
vec3 setupLastFrameViewSpacePos(in vec2 texcoord, in float depth) {
    vec3 screenSpacePos = vec3(texcoord, depth);
    vec3 clipSpacePos = screenSpacePos * 2.0 - 1.0;
    vec4 temp = (frx_lastViewProjectionMatrix) * vec4(clipSpacePos, 1.0);
    return temp.xyz / temp.w;
}
vec3 lastFrameViewSpaceToScreenSpace(in vec3 viewSpacePos) {
    vec4 temp = frx_lastViewProjectionMatrix * vec4(viewSpacePos, 1.0);
    return (temp.xyz / temp.w) * 0.5 + 0.5;
}

float clamp01(in float angle) {
    return clamp(angle, 0.0, 1.0);
}
vec2 clamp01(in vec2 angle) {
    return clamp(angle, vec2(0.0), vec2(1.0));
}
vec3 clamp01(in vec3 angle) {
    return clamp(angle, vec3(0.0), vec3(1.0));
}
vec4 clamp01(in vec4 angle) {
    return clamp(angle, vec4(0.0), vec4(1.0));
}

// Utility function to get frex time of day factors 
// vec3(dayFactor, nightFactor, sunsetFactor)
vec3 getTimeOfDayFactors() {
    float nightFactor = frx_worldIsMoonlit == 1.0 ? 1.0 : 0.0;
    nightFactor *= frx_skyLightTransitionFactor;
    float dayFactor = frx_worldIsMoonlit == 0.0 ? 1.0 : 0.0;
    dayFactor *= frx_skyLightTransitionFactor;
    float sunsetFactor = 1.0 - frx_skyLightTransitionFactor;

    return vec3(dayFactor, nightFactor, sunsetFactor);
}

// More canvas utility stuff
vec3 getSunVector() {
    vec3 sun = frx_worldIsMoonlit == 0 ? frx_skyLightVector : -frx_skyLightVector;
    return sun;
}
vec3 getMoonVector() {
    vec3 moon = frx_worldIsMoonlit == 1 ? frx_skyLightVector : -frx_skyLightVector;
    return moon;
}

float fbm2D(in vec2 uv, in int octaves) {
	float s = 0.0;
	float m = 0.0;
	float amp = 0.5;
	
	for(int i = 0; i < octaves; i++){
		s += amp * snoise(uv);
		m += amp;
		amp *= 0.5;
		uv *= 2.0;
	}
	return s/m;
}

vec2 rotate2D(vec2 uv, float angle) {
	float s = sin(angle);
	float c = cos(angle);
	mat2 mat = mat2(c, s, -s, c);
	return mat * uv;
}

float fbm2D(vec2 uv) {
    int octaves = 6;
	float noise = 0.01;
	float amp = 0.5;

    mat2 rotationMatrix = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));

	for (int i = 0; i < octaves; i++) {
		noise += amp * (snoise(uv) * 0.5 + 0.51);
		uv = uv * 2.0 + frx_renderSeconds / 10.0;
		amp *= 0.5;
	}

	return noise;
}

float rand1D(vec2 st) {
    return frx_noise2d(st) * 2.0 - 1.0;
}
vec2 rand2D(vec2 st) {
    return vec2(frx_noise2d(st), frx_noise2d(st + 10.0)) * 2.0 - 1.0;
}
vec3 rand3D(vec2 st) {
    return vec3(frx_noise2d(st), frx_noise2d(st + 10.0), frx_noise2d(st + 20.0)) * 2.0 - 1.0;
}

vec3 getReflectance(in vec3 f0, in float NdotV) {
    NdotV = max(0.0, NdotV);
    return f0 + (0.95 - f0) * pow((1.0 - NdotV), 5.0);
}
