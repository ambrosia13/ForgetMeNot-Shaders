/*
#include forgetmenot:shaders/lib/inc/lighting.glsl

Contains the diffuse lighting function as well as some other lighting utilities.
*/

#include forgetmenot:shaders/lib/inc/sky_display.glsl

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

float cascadeFactor(int x) {
	vec4 a = vec4(frx_viewDistance, 96.0, 32.0, 12.0);
	return a[x];
}

vec3 basicLighting(
	in vec3 albedo,

	in vec3 sceneSpacePos,

	in vec3 vertexNormal,
	in vec3 fragNormal,

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
	int shadowMapSamples,
	float nightVisionFactor
) {
	blockLight *= blockLight;
	skyLight *= skyLight;
	if(frx_worldHasSkylight == 0) skyLight = 1.0;

	float emission = clamp01(frx_luminance(albedo) - 1.0);
	float NdotL = mix(clamp01(dot(fragNormal, frx_skyLightVector)), 1.0, sssAmount);

	vec3 totalLighting = vec3(0.0);
	vec3 directLighting = vec3(0.0);
	vec3 ambientLighting = vec3(0.0);

	// Direct lighting
	if(frx_worldHasSkylight == 1) {
		vec4 shadowViewPos = frx_shadowViewMatrix * vec4(sceneSpacePos + vertexNormal * 0.1, 1.0);
		int cascade = selectShadowCascade(shadowViewPos);

		vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
		vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

		float shadowFactor = 0.0;
		float penumbraSize = 0.0;

		if(doPcss) {
			int pcssSamples = shadowMapSamples * 1;

			for(int i = 0; i < pcssSamples; i++) {
				vec2 sampleOffset = diskSampling(i, pcssSamples, sqrt(interleavedGradient(i + pcssSamples)) * TAU) * (250.0 / cascadeFactor(cascade));
				vec2 sampleCoord = shadowScreenPos.xy + sampleOffset / SHADOW_MAP_SIZE;

				float depthQuery = texture(shadowMapTexture, vec3(sampleCoord, cascade)).r;
				float diff = max(0.0, shadowScreenPos.z - depthQuery) * (frx_viewDistance * 20.0) / cascadeFactor(cascade);

				penumbraSize += diff / pcssSamples;
			}
		} else {
			penumbraSize = 2.0;
		}

		penumbraSize = max(1.0, penumbraSize);
		penumbraSize = mix(penumbraSize, 5.0 * cascade, sssAmount * (-sign(dot(vertexNormal, frx_skyLightVector)) * 0.5 + 0.5));

		for(int i = 0; i < shadowMapSamples; i++) {
			vec2 sampleOffset = diskSampling(i, shadowMapSamples, sqrt(interleavedGradient(i)) * TAU) * penumbraSize / SHADOW_MAP_SIZE;
			shadowFactor += texture(shadowMap, vec4(shadowScreenPos.xy + sampleOffset, cascade, shadowScreenPos.z)) / shadowMapSamples;
		}
		shadowFactor *= skyLight;

		#ifdef CLOUD_SHADOWS
			CloudLayer cloudLayer = createCumulusCloudLayer(frx_skyLightVector);
			cloudLayer.selfShadowSteps = 0;
			cloudLayer.noiseOctaves = 2;

			shadowFactor *= 0.25 + 0.75 * getCloudsTransmittanceAndScattering(frx_skyLightVector, cloudLayer).x;
		#endif

		shadowFactor = mix(shadowFactor, shadowFactor * 0.5 + 0.5, isWater);

		//vec3 directLightTransmittance = getValFromTLUT(transmittanceLut, skyViewPos + vec3(0.0, 0.00002, 0.0) * max(0.0, (sceneSpacePos + frx_cameraPos).y - 60.0), frx_skyLightVector);
		directLighting = 0.07 * textureLod(skybox, frx_skyLightVector, 2.0).rgb * NdotL * frx_skyLightTransitionFactor * shadowFactor;
		if(frx_worldIsMoonlit == 1) directLighting = nightAdjust(directLighting) * 0.5;
	}

	// Ambient lighting
	{
		vec3 skyLightDir = fragNormal;//mix(fragNormal, vec3(0.0, 1.0, 0.0), sssAmount);
		skyLightDir.y = abs(skyLightDir.y); // this prevents bottom faces from being too dark

		ambientLighting = textureLod(skybox, skyLightDir, 7).rgb * 2.0;

		// Prevent ambient lighting from getting too bright while still preserving the color
		// This is really cursed. If you're reading this in the future, I'm sorry.
		vec3 oppositeHorizonDir = normalize(vec3(-frx_skyLightVector.x, 0.0, -frx_skyLightVector.z));
		vec3 oppositeHorizonColor = textureLod(skybox, oppositeHorizonDir, 7).rgb;

		ambientLighting = normalize(ambientLighting) * min(length(ambientLighting), length(oppositeHorizonColor) * 2.0);

		ambientLighting *= skyLight;

		if(frx_worldIsNether == 1) {
			#ifdef NETHER_DIFFUSE
				ambientLighting *= 0.5;
				ambientLighting += vec3(2.0, 1.0, 0.0) * clamp01(-fragNormal.y * 0.75 + 0.25);
			#endif
		} else if(frx_worldIsEnd == 1) {
			ambientLighting += END_MIST_COLOR * clamp01(dot(fragNormal, normalize(vec3(-0.7, 0.1, 0.7))));
		}

		ambientLighting += AMBIENT_BRIGHTNESS;

		ambientLighting += 2.0 * blockLight * fmn_blockLightColor;
		
		// handheld light
		{
			float heldLightFactor = frx_smootherstep(pow4(frx_heldLight.a) * 13.0, 0.0, distance(frx_eyePos, sceneSpacePos + frx_cameraPos));
			heldLightFactor = pow3(heldLightFactor);

			heldLightFactor *= mix(clamp01(dot(-fragNormal, normalize((sceneSpacePos + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0)))), 1.0, frx_smootherstep(1.0, 0.0, distance(frx_eyePos + vec3(0.0, 1.0, 0.0), sceneSpacePos + frx_cameraPos))); // direct surfaces lit more - idea from Lumi Lights by spiralhalo

			#ifdef frx_isHand
				heldLightFactor = mix(heldLightFactor, 0.1, float(frx_isHand));
			#endif

			heldLightFactor *= 2.0 * step(0.01, frx_heldLight.a);
			ambientLighting += pow(frx_heldLight.rgb * 1.5, vec3(2.2)) * heldLightFactor;
		}

		ambientLighting *= vanillaAo;
	}

	totalLighting += directLighting + ambientLighting;
	totalLighting = mix(totalLighting, vec3(frx_luminance(totalLighting)), isWater);

	if(AMBIENT_BRIGHTNESS != 0.0) {
		// Tiny point light around the player so caves aren't completely dark
		totalLighting = max(totalLighting, vec3(0.2 * (1.0 - skyLight)) * exp(-length((sceneSpacePos + frx_cameraPos - frx_eyePos - vec3(0.0, 1.0, 0.0)) * 0.75)));
	}

	// Night vision
	totalLighting = mix(totalLighting, max(totalLighting, normalize(totalLighting) * vanillaAo), nightVisionFactor);

	vec3 color = albedo * (totalLighting + emission);
	return color;
}

// Schlick fresnel approximation
vec3 getReflectance(in vec3 f0, in float NdotV) {
	return f0 + (1.0 - f0) * pow(1.0 - NdotV, 5.0);
}
