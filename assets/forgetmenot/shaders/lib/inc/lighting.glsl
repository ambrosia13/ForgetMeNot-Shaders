/*
#include forgetmenot:shaders/lib/inc/lighting.glsl

Contains the diffuse lighting function as well as some other lighting utilities.
*/

// --------------------------------------------------------------------------------------------------------
// https://github.com/spiralhalo/CanvasTutorial/wiki/Chapter-4
// Utility functions for cascaded shadow maps
// --------------------------------------------------------------------------------------------------------
#ifdef FRAGMENT_SHADER
	// Helper function
	vec3 shadowDist(int cascade, vec4 pos) {
		vec4 c = frx_shadowCenter(cascade);
		return abs((c.xyz - pos.xyz) / c.w);
	}

	// Function for obtaining the cascade level
	int selectShadowCascade(vec4 shadowViewSpacePos) {
		vec3 d3 = shadowDist(3, shadowViewSpacePos);
		vec3 d2 = shadowDist(2, shadowViewSpacePos);
		vec3 d1 = shadowDist(1, shadowViewSpacePos);

		int cascade = 0;

		if (d3.x < 1.0 && d3.y < 1.0 && d3.z < 1.0) {
			cascade = 3;
		} else if (d2.x < 1.0 && d2.y < 1.0 && d2.z < 1.0) {
			cascade = 2;
		} else if (d1.x < 1.0 && d1.y < 1.0 && d1.z < 1.0) {
			cascade = 1;
		}

		return cascade;
	}
#endif
// --------------------------------------------------------------------------------------------------------

vec3 setupShadowPos(in vec3 sceneSpacePos, in vec3 bias, out int cascade) {
	vec4 shadowViewPos = frx_shadowViewMatrix * vec4(sceneSpacePos + bias, 1.0);
	cascade = selectShadowCascade(shadowViewPos);

	vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
	vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

	return shadowScreenPos;
}

vec3 basicLighting(
	in vec3 albedo,
	in vec3 sceneSpacePos,
	in vec3 normal,
	in float blockLight,
	in float skyLight,
	in float vanillaAo,
	in float f0,
	in float roughness,
	in float sssAmount,
	in float isWater,
	in samplerCube skybox,
	in sampler2D transmittanceLut,
	in sampler2DArrayShadow shadowMap,
	in sampler2DArray shadowMapTexture,
	bool doPcss,
	int shadowMapSamples
) {
	skyLight = mix(skyLight, 1.0, float(frx_worldIsEnd));

	float emission = clamp01(frx_luminance(albedo) - 1.0);
	float NdotL = mix(clamp01(dot(normal, frx_skyLightVector)), 1.0, sssAmount);

	vec3 totalLighting = vec3(0.0);
	vec3 directLighting = vec3(0.0);
	vec3 ambientLighting = vec3(0.0);

	// Direct lighting
	if(frx_worldHasSkylight == 1) {
		vec4 shadowViewPos = frx_shadowViewMatrix * vec4(sceneSpacePos + normal * 0.1, 1.0);
		int cascade = selectShadowCascade(shadowViewPos);
		float cascadeF = float(cascade);

		vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
		vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

		//shadowScreenPos.z -= 0.0005 * (3 - cascade) * (1.0 - NdotL);

		float shadowFactor = 0.0;
		float penumbraSize = 0.5;
		
		if(doPcss) {
			for(int i = 0; i < shadowMapSamples; i++) {
				vec2 sampleOffset = diskSampling(i, shadowMapSamples, sqrt(interleavedGradient(i + shadowMapSamples)) * TAU) * (10.0 * cascade);
				vec2 sampleCoord = shadowScreenPos.xy + sampleOffset / SHADOW_MAP_SIZE;

				float depthQuery = texture(shadowMapTexture, vec3(sampleCoord, cascade)).r;
				float diff = max(0.0, shadowScreenPos.z - depthQuery) * 500.0 * mix(mix(mix(0.5, 1.0, step(0.5, cascadeF)), 2.0, step(1.5, cascadeF)), 3.0, step(2.5, cascadeF));

				penumbraSize += min(1.0 * cascade, diff / shadowMapSamples);
			}
		} else {
			penumbraSize = 2.0;
		}

		penumbraSize = mix(penumbraSize, 5.0 * cascade, sssAmount * (-sign(dot(normal, frx_skyLightVector)) * 0.5 + 0.5));

		for(int i = 0; i < shadowMapSamples; i++) {
			vec2 sampleOffset = diskSampling(i, shadowMapSamples, sqrt(interleavedGradient(i)) * TAU) * penumbraSize / SHADOW_MAP_SIZE;
			shadowFactor += texture(shadowMap, vec4(shadowScreenPos.xy + sampleOffset, cascade, shadowScreenPos.z)) / shadowMapSamples;
		}
		shadowFactor *= skyLight;

		shadowFactor = mix(shadowFactor, shadowFactor * 0.5 + 0.5, isWater);

		vec3 directLightTransmittance = getValFromTLUT(transmittanceLut, skyViewPos + vec3(0.0, 0.00002, 0.0) * max(0.0, (sceneSpacePos + frx_cameraPos).y - 60.0), frx_skyLightVector);
		directLighting = 10.0 * directLightTransmittance * NdotL * frx_skyLightTransitionFactor * shadowFactor;
		if(frx_worldIsMoonlit == 1) directLighting = nightAdjust(directLighting);
	}

	// Ambient lighting
	{
		ambientLighting = textureLod(skybox, normal, 7).rgb;
		ambientLighting = mix(vec3(0.01), ambientLighting, skyLight);

		ambientLighting += 1.0 * blockLight * vec3(1.3, 1.0, 0.7);
		
		// handheld light
		{
			float heldLightFactor = 1.0 / (1.0 + pow2(distance(frx_eyePos + vec3(0.0, 1.0, 0.0), sceneSpacePos + frx_cameraPos)));//frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, sceneSpacePos + frx_cameraPos));

			heldLightFactor *= mix(clamp01(dot(-normal, fNormalize((sceneSpacePos + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0)))), 1.0, frx_smootherstep(1.0, 0.0, distance(frx_eyePos + vec3(0.0, 1.0, 0.0), sceneSpacePos + frx_cameraPos))); // direct surfaces lit more - idea from Lumi Lights by spiralhalo

			#ifdef frx_isHand
				heldLightFactor = mix(heldLightFactor, 0.1, float(frx_isHand));
			#endif

			heldLightFactor *= 2.0 * step(0.01, frx_heldLight.a);
			ambientLighting += pow(frx_heldLight.rgb * (1.0 + frx_heldLight.a), vec3(2.2)) * heldLightFactor;
		}

		ambientLighting *= vanillaAo;
	}

	totalLighting += directLighting + ambientLighting;
	totalLighting = mix(totalLighting, vec3(frx_luminance(totalLighting)), isWater);

	vec3 color = albedo * (totalLighting + emission);
	return color;
}

// Schlick fresnel approximation
vec3 getReflectance(in vec3 f0, in float NdotV, in float r) {
	float k = 1.0 / inversesqrt(r);
	return f0 + (1.0 - f0) * (pow((1.0 - k) * (1.0 - NdotV) + k * 0.5, 5.0));
}
