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

// More canvas utility stuff
vec3 getSunVector() {
    vec3 sun = frx_worldIsMoonlit == 0 ? frx_skyLightVector : -frx_skyLightVector;
    return sun;
}
vec3 getMoonVector() {
    vec3 moon = frx_worldIsMoonlit == 1 ? frx_skyLightVector : -frx_skyLightVector;
    return moon;
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
		uv = uv * 2.0 + fmn_time / 5.0 * (mod(i, 2) - 2);
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
		uv = uv * 2.0 + fmn_time / 10.0;
		amp *= 0.5;
	}

	return noise;
}
float fbmOctaves(vec3 uv, int octaves) {
	float noise = 0.01;
	float amp = 0.5;

    mat2 rotationMatrix = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));

	for (int i = 0; i < octaves; i++) {
		noise += amp * (snoise(uv) * 0.5 + 0.51);
		uv = uv * 2.0 + fmn_time / 10.0;
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

	float a =  hash11((n + 0.0)) * 2.0 - 1.0;
	float b =  hash11((n + 1.0)) * 2.0 - 1.0;
	float c = hash11((n + 57.0)) * 2.0 - 1.0;
	float d = hash11((n + 58.0)) * 2.0 - 1.0;
	
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
		uv = rotationMatrix * uv * 2.0 + mod(fmn_time / 10.0, 1000.0);
		amp *= 0.5;
	}

    return noise;
}
float fbmHash(vec2 uv, int octaves, float t) {
	float noise = 0.01;
	float amp = 0.5;

    mat2 rotationMatrix = mat2(cos(PI / 6.0), sin(PI / 6.0), -sin(PI / 6.0), cos(PI / 6.0));

	for (int i = 0; i < octaves; i++) {
		noise += amp * (smoothHash(uv) * 0.5 + 0.51);
		uv = rotationMatrix * uv * 2.0 + mod(fmn_time * t, 1000.0);
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

// https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html
vec3 temperatureToRGB(in float k) {
    k /= 100.0;

    float red;
    float green;
    float blue;

    if(k <= 66) {
        red = 1.0;

        green = k;
        green = 99.4708025861 * log(green) - 161.1195681661;
        green = clamp01(green);

        if(k <= 19.0) {
            blue = 0.0;
        } else {
            blue = k - 10.0;
            blue = 138.5177312231 * log(blue) - 305.0447927307;
            blue = clamp01(blue);
        }
    } else {
        red = k - 60.0;
        red = 329.698727446 * pow(red, -0.1332047592);
        red = clamp01(red);

        green = k - 60.0;
        green = 288.1221695283 * pow(green, -0.0755148492);
        green = clamp01(green);

        blue = 1.0;
    }

    return vec3(red, green, blue);
    
}

// Thanks SixthSurge#3922 for helping me with curl noise which makes cirrus clouds much nicer
vec2 curlNoise(in vec2 plane) {
    float offset = 1e-3;
    float dx = snoise(plane + vec2(offset, 0.0));
    dx -= snoise(plane - vec2(offset, 0.0));
    dx /= 2.0 * offset;

    float dy = snoise(plane + vec2(0.0, offset));
    dy -= snoise(plane - vec2(0.0, offset));
    dy /= 2.0 * offset;

    return vec2(-dy, dx);
}

vec2 fbmCurl(in vec2 plane, in int octaves) {
    vec2 noise = vec2(0.01);
    float amp = 0.5;

    mat2 rotationMatrix = mat2(cos(PI / 6.0), sin(PI / 6.0), -sin(PI / 6.0), cos(PI / 6.0));

    for(int i = 0; i < octaves; i++) {
        noise += amp * curlNoise(plane);
        plane = rotationMatrix * plane;
        amp *= 0.5;
    }

    return noise * ((octaves + 1.0) / octaves);
}

#include forgetmenot:shaders/lib/functions/noise.glsl 

#define GOLDEN_RATIO 1.618033988749894

// From Belmu#4066
vec2 uniformAnimatedNoise(in vec2 seed) {
    return fract(seed + vec2(GOLDEN_RATIO * frx_renderSeconds, (GOLDEN_RATIO + GOLDEN_RATIO) * mod(frx_renderSeconds, 100.0)));
}