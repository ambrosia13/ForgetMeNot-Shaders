#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/packing.glsl
#include forgetmenot:shaders/lib/inc/material.glsl
#include forgetmenot:shaders/lib/inc/lighting.glsl

uniform sampler2D u_depth;
uniform usampler2D u_material_data;
uniform sampler2D u_light_data;

uniform sampler2DArray u_shadow_tex;
uniform sampler2DArrayShadow u_shadow_map;

uniform sampler2D u_previous_rtao;
uniform sampler2D u_previous_depth;
uniform sampler2D u_previous_normal;

uniform samplerCube u_skybox;
uniform sampler2D u_transmittance;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragDisocclusion;

struct Light {
	vec3 color;
	bool isFullCube;
};

struct Hit {
	vec3 pos;
	vec3 normal;

	bool success;
	Light light;
};

const Hit NO_HIT = Hit(vec3(0.0), vec3(0.0), false, Light(vec3(0.0), false));
const Hit OUT_OF_RANGE = Hit(vec3(1000.0), vec3(1000.0), true, Light(vec3(0.0), false));

bool evaluateHit(inout Hit hit, in vec3 voxelPos) {
	frx_LightData data = frx_getLightOcclusionData(u_light_data, voxelPos);

	bool condition = (data.isOccluder && data.isFullCube) || data.isLightSource;
	if(condition) {
		hit.light = Light(data.light.rgb, data.isFullCube);

		return condition;
	}

	return false;
}

Hit raytrace(vec3 rayPos, vec3 rayDir, int raytraceLength) {
	Hit hit = NO_HIT;

	rayPos += frx_cameraPos;

	vec3 stepSizes = 1.0 / abs(rayDir);
	vec3 stepDir = sign(rayDir);
	vec3 nextDist = (stepDir * 0.5 + 0.5 - fract(rayPos)) / rayDir;

	ivec3 voxelPos = ivec3(floor(rayPos));
	vec3 currentPos = rayPos;

	for(int i = 0; i < raytraceLength; i++) {
		float closestDist = min(nextDist.x, min(nextDist.y, nextDist.z));

		currentPos += rayDir * closestDist;

		vec3 stepAxis = vec3(lessThanEqual(nextDist, vec3(closestDist)));

		voxelPos += ivec3(stepAxis * stepDir);

		nextDist -= closestDist;
		nextDist += stepSizes * stepAxis;

		hit.normal = stepAxis;

		if(evaluateHit(hit, voxelPos)) {
			hit.pos = currentPos - frx_cameraPos;
			hit.normal *= -stepDir;
			hit.success = true;
			break;
		}
	}

	return hit;
}

void main() {
	initGlobals();

	float depth = texture(u_depth, texcoord).r;

	if(depth == 1.0) {
		discard;
	}

	uvec3 packedSample = texture(u_material_data, texcoord).xyz;
	vec3 sceneSpacePos = setupSceneSpacePos(texcoord, depth);

	vec3 sunLightColor = getDirectLightColor(u_transmittance, sceneSpacePos);

	Material material = unpackMaterial(packedSample);

	vec3 rayPos = sceneSpacePos + material.vertexNormal * 0.02;
	vec3 rayColor = vec3(0.0);

	const int numRays = 1;
	const int numBounces = 4;
	for(int i = 0; i < numRays; i++) {
		vec3 throughput = vec3(1.0);
		vec3 radiance = vec3(0.0);

		vec3 rayDir = generateCosineVector(material.fragNormal);
		vec3 incomingNormal = material.fragNormal;

		for(int b = 0; b < numBounces; b++) {
			Hit hit = raytrace(rayPos, rayDir, 40);

			// ray didn't hit anything, add sky color
			if(!hit.success) {
				radiance += throughput * 2.0 * textureLod(u_skybox, rayDir, 0).rgb;
				break;
			}

			float NdotL = clamp01(dot(incomingNormal, frx_skyLightVector));
			radiance += sunLightColor * NdotL * getShadowFactor(
				hit.pos, incomingNormal, 0.0, true, 4, u_shadow_tex, u_shadow_map
			);

			radiance += hit.light.color * 1.0;
			throughput *= 0.5 / PI;

			rayPos = hit.pos;
			rayDir = generateCosineVector(hit.normal);

			incomingNormal = hit.normal;
		}

		rayColor += radiance / numRays;
	}

	vec3 result = rayColor;

	vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
	vec3 lastScreenPos = lastFrameSceneSpaceToScreenSpace(sceneSpacePos + positionDifference);
	
	vec4 previousResult = texture(u_previous_rtao, lastScreenPos.xy);
	float pixelAge = previousResult.a;

	float previousDepth = texture(u_previous_depth, lastScreenPos.xy).r;
	vec3 previousNormal = texture(u_previous_normal, lastScreenPos.xy).rgb;

	bool disocclusion = clamp01(lastScreenPos.xy) != lastScreenPos.xy;

	float depthTolerance = 0.1 + 0.05 * (length(sceneSpacePos));
	disocclusion = disocclusion || abs(linearizeDepth(depth) - linearizeDepth(previousDepth)) > depthTolerance;
	disocclusion = disocclusion || length(material.fragNormal - previousNormal) > 0.01;


	if(!disocclusion) {
		float accumulationFactor = 1.0 - (1.0 / min(120.0, pixelAge + 1.0));

		result = mix(result, previousResult.rgb, accumulationFactor);
		pixelAge += 1.0;
	} else {
		pixelAge = 0.0;
	}

	fragColor = vec4(result, pixelAge);
	fragDisocclusion = vec4(float(disocclusion));	
}