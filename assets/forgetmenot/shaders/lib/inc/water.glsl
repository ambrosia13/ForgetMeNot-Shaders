#include forgetmenot:shaders/lib/inc/utility.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl

float mirroredNoise(in vec2 uv) {
	return snoise(repeatAndMirrorCoords(uv / 250.0) * 250.0) * 0.5 + 0.5;
}

vec2 mirroredNoiseDXY(in vec2 uv) {
	return smoothHashDXY(repeatAndMirrorCoords(uv / 250.0) * 250.0);
}

float getWaterHeight(in vec2 uv, in int octaves) {
	// float waterNoise = 0.0;

	// uv = rotate2D(uv, -PI / 6.0);

	// for(int i = 0; i < octaves; i++) {
	// 	uv *= vec2(1.7, 1.1);
	// 	uv = rotate2D(uv, PI / 3.0 / octaves);
	// 	uv += fmn_time * 0.1 * exp2(i);

	// 	waterNoise += smoothHash(uv) * exp2(-i + 1);
	// }

	// return waterNoise / octaves;

	// uv *= 0.3;

	// float waterNoise = 0.0;
	// float amplitude = 1.0;

	// for(int i = 0; i < octaves; i++) {
	// 	uv *= 1.5;
	// 	uv += 100.0;
	// 	uv += fmn_time * 0.1 * i;

	// 	float noise = snoise(uv) * 0.5 + 0.5;

	// 	waterNoise += noise * amplitude;
	// 	amplitude *= 0.45;
	// }

	// return waterNoise / octaves;

	// float waterNoise = (snoise(uv + fmn_time * 0.1) * 0.5 + 0.5) * 0.5 * (pow2(sin(fmn_time)) * 0.5 + 0.5);
	// waterNoise += (snoise(uv * 1.5 - fmn_time * 0.2) * 0.5 + 0.5) * 0.25 * (pow2(sin(fmn_time + 10.0)) * 0.5 + 0.5);
	// waterNoise += (snoise(uv * 2.5 + fmn_time * 0.3) * 0.5 + 0.5) * 0.125 * (pow2(sin(fmn_time - 10.0)) * 0.5 + 0.5);

	// return waterNoise;

	return fbmHash(uv * 2.0, 5, 1.5, 0.4) * 0.75;
}
float getWaterHeight(in vec2 uv) {
	return getWaterHeight(uv, 5);
}

vec2 getWaterHeightDXY(in vec2 uv) {
	float sampleOffset = 1e-3;

	float center = getWaterHeight(uv);
	float diffX = (getWaterHeight(uv + vec2(sampleOffset, 0.0)) - center) / sampleOffset;
	float diffY = (getWaterHeight(uv + vec2(0.0, sampleOffset)) - center) / sampleOffset;

	return vec2(diffX, diffY) * sampleOffset * 100.0;
}

struct ParallaxResult {
	vec2 coord;
	float shiftDistance;
};

// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
ParallaxResult waterParallax(in mat3 tbn, in vec3 sceneSpacePos, in vec2 uv) {
	vec3 viewDir = normalize(tbn * sceneSpacePos);

	float minLayers = 16.0;
	float maxLayers = 32.0;

	float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), viewDir)));
	float layerDepth = 1.0 / numLayers;

	float currentLayerDepth = 0.0;
	
	vec2 shift = viewDir.xy / viewDir.z * 0.2;
	vec2 deltaUv = shift / numLayers;

	vec2 currentUv = uv;
	float currentHeight = getWaterHeight(currentUv, 3);

	int safetyCount = 0;
	int safetyLimit = int(maxLayers + 0.5);
	while(currentLayerDepth < currentHeight && safetyCount++ < safetyLimit) {
		currentUv -= deltaUv;
		currentHeight = getWaterHeight(currentUv, 3);

		currentLayerDepth += layerDepth;
	}

	vec2 previousUv = currentUv + deltaUv;

	// interpolation
	float after = currentHeight - currentLayerDepth;
	float before = getWaterHeight(previousUv, 3) - currentLayerDepth + layerDepth;

	float weight = after / (after - before);
	
	vec2 finalUv = mix(currentUv, previousUv, weight);

	return ParallaxResult(finalUv, currentLayerDepth);
}
