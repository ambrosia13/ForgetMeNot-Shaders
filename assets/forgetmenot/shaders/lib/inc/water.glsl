#include forgetmenot:shaders/lib/inc/utility.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl

float mirroredNoise(in vec2 uv) {
	return snoise(repeatAndMirrorCoords(uv / 250.0) * 250.0) * 0.5 + 0.5;
}

vec2 mirroredNoiseDXY(in vec2 uv) {
	return smoothHashDXY(repeatAndMirrorCoords(uv / 250.0) * 250.0);
}

float getWaterHeight(in vec2 uv, in int octaves) {
	uv *= 2.0;
	float lacunarity = 1.5;
	float t = 0.4;

	float noise = 0.01;
	float amp = 0.5;

	for (int i = 0; i < octaves; i++) {
		noise += amp * smoothstep(0.0, 1.0, smoothHash(uv));
		uv = ROTATE_30_DEGREES * uv * lacunarity + mod(frx_renderSeconds * t, 1000.0);
		amp *= 0.5;
	}

	return (noise * (octaves + 1.0) / octaves) * 0.5;
}
float getWaterHeight(in vec2 uv) {
	return getWaterHeight(uv, 5);
}

vec2 getWaterHeightDXY(in vec2 uv) {
	float sampleOffset = 1e-3;

	float center = getWaterHeight(uv);
	float diffX = (getWaterHeight(uv + vec2(sampleOffset, 0.0)) - center) / sampleOffset;
	float diffY = -(getWaterHeight(uv + vec2(0.0, sampleOffset)) - center) / sampleOffset;

	return vec2(diffX, diffY) * sampleOffset * 100.0;
}

struct ParallaxResult {
	vec2 coord;
	float shiftDistance;
};

// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
ParallaxResult waterParallax(in mat3 tbn, in vec3 sceneSpacePos, in vec2 uv) {
	vec3 viewDir = normalize(transpose(tbn) * sceneSpacePos);

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
