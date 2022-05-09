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

// More canvas utility stuff
vec3 getSunVector() {
    vec3 sun = frx_worldIsMoonlit == 0 ? frx_skyLightVector : -frx_skyLightVector;
    return sun;
}
vec3 getMoonVector() {
    vec3 moon = frx_worldIsMoonlit == 1 ? frx_skyLightVector : -frx_skyLightVector;
    return moon;
}

float cubic(in float x) {
	return x * x * (3.0 - 2.0 * x);
}

// Utility function to get frex time of day factors 
// vec3(dayFactor, nightFactor, sunsetFactor)
vec3 getTimeOfDayFactors() {
    float nightFactor = frx_worldIsMoonlit == 1.0 ? 1.0 : 0.0;
    nightFactor *= frx_skyLightTransitionFactor;
    float dayFactor = frx_worldIsMoonlit == 0.0 ? 1.0 : 0.0;
    dayFactor *= frx_skyLightTransitionFactor;
    float sunsetFactor = 1.0 - frx_skyLightTransitionFactor;

    // float sunUp = dot(vec3(0.0, 1.0, 0.0), getSunVector());
    // float sunDown = dot(vec3(0.0, -1.0, 0.0), getSunVector());

    // dayFactor = 1.0 - pow(1.0 - clamp01(sunUp), 6.0);
    // sunsetFactor = 1.0 - dayFactor;
    // nightFactor = cubic(cubic(clamp01(sunDown * 20.0 + 0.4)));
    // nightFactor = 1.0 - pow(1.0 - nightFactor, 2.0);
    // sunsetFactor *= 1.0 - nightFactor;
    // dayFactor *= 1.0 - nightFactor;

    // float dayFactor, nightFactor, sunsetFactor;

    // float ticks = frx_worldTime * 24000.0;

    // dayFactor = frx_smootherstep(0.0, 1500.0, ticks) - frx_smootherstep(11500.0, 13000.0, ticks);
    // nightFactor = frx_smootherstep(13000.0, 14500.0, ticks) - frx_smootherstep(21500.0, 23000.0, ticks);
    // // branching doesn't have much impact if condition is universal across the whole screen, so this is not as cursed as it looks
    // // Okay, maybe it is still pretty cursed
    // if(ticks < 15000.0 && ticks > 6000.0) sunsetFactor = frx_smootherstep(11500.0, 13000.0, ticks) - frx_smootherstep(13000.0, 14500.0, ticks);
    // else if(ticks > 20000.0) sunsetFactor = frx_smootherstep(21500.0, 23000.0, ticks);// - frx_smootherstep(23000.0, 25500.0, ticks);
    // else sunsetFactor = frx_smootherstep(1500.0, 0.0, ticks);

    return vec3(dayFactor, nightFactor, sunsetFactor);
}
float getWorldTime() {
    return frx_worldTime * 24000.0 + frx_worldDay * 24000.0;
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
    int octaves = 3;
	float noise = 0.01;
	float amp = 0.5;

    mat2 rotationMatrix = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));

	for (int i = 0; i < octaves; i++) {
		noise += amp * (snoise(uv) * 0.5 + 0.51);
		uv = uv * 2.0 + frx_renderSeconds / 5.0 * (mod(i, 2) - 2);
		amp *= 0.5;
	}

	return noise;
}
float fbmOctaves(vec2 uv, int octaves) {
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

#include forgetmenot:shaders/lib/functions/external.glsl 

float rand1D(vec2 st) {
    //return frx_noise2d(st) * 2.0 - 1.0;
    return hash12(st) * 2.0 - 1.0;
}
vec2 rand2D(vec2 st) {
    //return vec2(frx_noise2d(st), frx_noise2d(st + 10.0)) * 2.0 - 1.0;
    return hash22(st) * 2.0 - 1.0;
}
vec3 rand3D(vec2 st) {
    //return vec3(frx_noise2d(st), frx_noise2d(st + 10.0), frx_noise2d(st + 20.0)) * 2.0 - 1.0;
    return hash32(st) * 2.0 - 1.0;
}

vec3 getReflectance(in vec3 f0, in float NdotV) {
    NdotV = clamp01(NdotV);
    return f0 + (0.95 - f0) * pow((1.0 - NdotV), 5.0);
}

vec2 coordFrom3D(vec3 viewDir){
    return vec2(atan(viewDir.x, viewDir.y), acos(viewDir.z));   
}

float smoothHash(in vec2 st) {
	vec2 p = floor(st);
	vec2 f = fract(st);
		
	float n = p.x + p.y*57.0;

	float a = rand1D(vec2(n + 0.0));
	float b = rand1D(vec2(n + 1.0));
	float c = rand1D(vec2(n + 57.0));
	float d = rand1D(vec2(n + 58.0));
	
	vec2 f2 = f * f;
	vec2 f3 = f2 * f;
	
	vec2 t = 3.0 * f2 - 2.0 * f3;
	
	float u = t.x;
	float v = t.y;

	float noise = a + (b - a) * u +(c - a) * v + (a - b + d - c) * u * v;
    // float noise = mix(a, b, f.x) + (c - a) * f.y * (1.0 - f.x) + (d - b) * f.x * f.y;

    return noise;
}
float fbmHash(vec2 uv, int octaves) {
	float noise = 0.01;
	float amp = 0.5;

    mat2 rotationMatrix = mat2(cos(PI / 6.0), sin(PI / 6.0), -sin(PI / 6.0), cos(PI / 6.0));

	for (int i = 0; i < octaves; i++) {
		noise += amp * (smoothHash(uv) * 0.5 + 0.51);
		uv = rotationMatrix * uv * 2.0 + mod(frx_renderSeconds / 10.0, 1000.0);
		amp *= 0.5;
	}

    return noise;
}

// https://www.shadertoy.com/view/fsjBWm
vec4 fastDownsample(sampler2D image, vec2 uv) {
    vec4 col = vec4(0.0);
    col += 0.37487566 * texture(image, uv + vec2(-0.75777156,-0.75777156) / frxu_size);
    col += 0.37487566 * texture(image, uv + vec2(0.75777156,-0.75777156) / frxu_size);
    col += 0.37487566 * texture(image, uv + vec2(0.75777156,0.75777156) / frxu_size);
    col += 0.37487566 * texture(image, uv + vec2(-0.75777156,0.75777156) / frxu_size);
    col += -0.12487566 * texture(image, uv + vec2(-2.90709914,0.0) / frxu_size);
    col += -0.12487566 * texture(image, uv + vec2(2.90709914,0.0) / frxu_size);
    col += -0.12487566 * texture(image, uv + vec2(0.0,-2.90709914) / frxu_size);
    col += -0.12487566 * texture(image, uv + vec2(0.0,2.90709914) / frxu_size);

    return col;
}

vec3 nightEyeAdjust(in vec3 color) {
    float amt = getTimeOfDayFactors().y * 0.5;
    return mix(color, frx_luminance(color) * vec3(0.2, 0.5, 1.0), amt);
}

#include forgetmenot:shaders/lib/functions/noise.glsl 
