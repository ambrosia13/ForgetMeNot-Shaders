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

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

struct Hit {
	vec3 pos;
	vec3 normal;

	bool success;
};

const Hit NO_HIT = Hit(vec3(0.0), vec3(0.0), false);

bool evaluateHit(in vec3 voxelPos) {
	frx_LightData data = frx_getLightOcclusionData(u_light_data, voxelPos);

	return data.isOccluder && data.isFullCube;
}

Hit raytraceAo(vec3 rayPos, vec3 rayDir, int raytraceLength) {
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

		if(evaluateHit(voxelPos)) {
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

	if(depth != 1.0) {
		uvec3 packedSample = texture(u_material_data, texcoord).xyz;
		Material material = unpackMaterial(packedSample);

		vec3 originalSceneSpacePos = setupSceneSpacePos(texcoord, depth);
		vec3 sceneSpacePos = originalSceneSpacePos + 0.01 * material.vertexNormal;

		float ambientOcclusion = 1.0;
		float sunBounceAmount = 0.0;

		const int numAoRays = 3;
		const int numSunBounceRays = numAoRays; // May need to be adjusted.

		const float rayContribution = 1.0 / numAoRays;

		const float aoStrength = RTAO_STRENGTH;

		const int aoRange = 2;

		vec3 rayPos = sceneSpacePos + material.vertexNormal * 0.01;

		for(int i = 0; i < numAoRays; i++) {
			vec3 rayDir = generateCosineVector(material.fragNormal);

			Hit hit = raytraceAo(rayPos, rayDir, aoRange + 1);
			if(hit.success) {
				float distToHit = distance(hit.pos, rayPos);
				float aoDistanceFactor = smoothstep(float(aoRange), float(aoRange - 1), distToHit);

				#ifdef INDIRECT_SUNLIGHT
					if(i < numSunBounceRays) {
						sunBounceAmount += getShadowFactor(
							hit.pos,
							hit.normal,
							0.0,
							true,
							4, 
							u_shadow_tex, 
							u_shadow_map
						) / numSunBounceRays * clamp01(dot(hit.normal, frx_skyLightVector)) * aoDistanceFactor * material.skyLight;
					}
				#endif

				ambientOcclusion -= rayContribution * aoStrength * aoDistanceFactor;
			}
		}

		vec4 result = vec4(ambientOcclusion, sunBounceAmount, 0.0, 1.0);

		vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
		vec3 lastScreenPos = lastFrameSceneSpaceToScreenSpace(originalSceneSpacePos + positionDifference);
		
		vec4 previousResult = texture(u_previous_rtao, lastScreenPos.xy);
		float previousDepth = texture(u_previous_depth, lastScreenPos.xy).r;
		vec3 previousNormal = texture(u_previous_normal, lastScreenPos.xy).rgb;

		bool disocclusion = clamp01(lastScreenPos.xy) != lastScreenPos.xy;
		disocclusion = disocclusion || dot(previousNormal, material.fragNormal) < 0.9;


		float depthTolerance = 0.1 + 0.1 * length(sceneSpacePos);
		disocclusion = disocclusion || abs(linearizeDepth(depth) - linearizeDepth(previousDepth)) > depthTolerance;

		if(!disocclusion) {
			result = mix(result, previousResult, 0.9);
		}

		fragColor = result;
	} else {
		fragColor = vec4(0.0);
	}
}