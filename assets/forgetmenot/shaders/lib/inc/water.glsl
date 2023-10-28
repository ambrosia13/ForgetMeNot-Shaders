#include forgetmenot:shaders/lib/inc/utility.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl

float mirroredNoise(in vec2 uv) {
	return snoise(repeatAndMirrorCoords(uv / 250.0) * 250.0) * 0.5 + 0.5;
}

vec2 mirroredNoiseDXY(in vec2 uv) {
	return smoothHashDXY(repeatAndMirrorCoords(uv / 250.0) * 250.0);
}

float getWaterHeight(in vec2 uv, in int octaves) {
	float waterNoise = 0.0;

	uv = rotate2D(uv, -PI / 6.0);

	for(int i = 0; i < octaves; i++) {
		uv *= vec2(1.7, 1.1);
		uv = rotate2D(uv, PI / 3.0 / octaves);
		uv += fmn_time * 0.1 * exp2(i);

		waterNoise += pow4(smoothHash(uv)) * exp2(-i + 1);
	}

	return waterNoise / octaves;
}
float getWaterHeight(in vec2 uv) {
	return getWaterHeight(uv, 5);
}

vec2 getWaterHeightDXY(in vec2 uv) {
	float sampleOffset = 1e-3;

	float center = getWaterHeight(uv);
	float diffX = (getWaterHeight(uv + vec2(sampleOffset, 0.0)) - center) / sampleOffset;
	float diffY = (getWaterHeight(uv + vec2(0.0, sampleOffset)) - center) / sampleOffset;

	return vec2(diffX, diffY) * 0.1;
}

struct ParallaxResult {
	vec2 coord;
	float shiftDistance;
};

// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
ParallaxResult waterParallax(in mat3 tbn, in vec3 sceneSpacePos, in vec2 uv) {
	vec3 viewDir = normalize(tbn * sceneSpacePos);

	float minLayers = 8.0;
	float maxLayers = 16.0;

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
