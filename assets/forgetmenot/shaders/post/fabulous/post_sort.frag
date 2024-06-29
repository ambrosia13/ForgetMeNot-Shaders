#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/lighting.glsl
#include forgetmenot:shaders/lib/inc/packing.glsl
#include forgetmenot:shaders/lib/inc/material.glsl
#include forgetmenot:shaders/lib/inc/raytrace.glsl

uniform sampler2D u_color;
uniform sampler2D u_depth;

uniform sampler2D u_transmittance;
uniform sampler2D u_multiscattering;

uniform sampler2DArrayShadow u_shadow_map;
uniform sampler2DArray u_shadow_tex;

uniform samplerCube u_skybox;

uniform sampler2D u_hi_depth_levels;
uniform usampler2D u_data;

uniform sampler2D u_smooth_uniforms;
uniform sampler2D u_previous_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void reflections(
	inout vec3 color,
	in sampler2D reflectionColorSampler,
	in sampler2D hiDepthLevels,
	in samplerCube skyboxSampler,
	in Material material,
	in float depth,
	in vec3 sceneSpacePos,
	in vec3 viewDir
) {
	if(!(depth < 1.0 && (material.roughness < 0.3 || material.f0 > 0.99))) {
		return;
	}

	float skyboxSharpeningFactor = 2.0 * pow(clamp01(dot(viewDir, frx_skyLightVector)), 8.0);
	skyboxSharpeningFactor *= smoothstep(0.0, 100.0, length(sceneSpacePos));
	skyboxSharpeningFactor = mix(skyboxSharpeningFactor, 0.0, frx_skyLightTransitionFactor);

	vec3 atmosphericColor = textureLod(skyboxSampler, viewDir, 6.0 - skyboxSharpeningFactor).rgb;
	vec3 atmosphericColorTop = textureLod(skyboxSampler, vec3(0.0, 1.0, 0.0), 7).rgb;
	float atmosphereBrightness = frx_luminance(atmosphericColorTop);

	vec3 reflectColor = vec3(0.0);

	vec3 cleanReflectDir = reflect(viewDir, material.fragNormal);

	// Attempts to fix nonsense normals
	// Shifts the fragment normal to be more aligned with the vertex normal until the reflection is possible
	for(int i = 0; i < 10 && dot(cleanReflectDir, material.vertexNormal) < 0.0; i++) {
		material.fragNormal = normalize(material.fragNormal + material.vertexNormal * 0.5);
		cleanReflectDir = reflect(viewDir, material.fragNormal);
	}

	vec3 reflectance = getReflectance(vec3(material.f0 * material.f0), clamp01(dot(-material.fragNormal, viewDir)), material.roughness);

	vec3 ambientReflectionColor = WATER_COLOR * atmosphereBrightness;
	if(frx_cameraInWater == 0) {
		ambientReflectionColor = textureLod(skyboxSampler, cleanReflectDir, 7.0 * rcp(inversesqrt(material.roughness))).rgb * material.skyLight;
		drawSunOnAtmosphere(ambientReflectionColor, cleanReflectDir, u_transmittance);
	}

	// number of rays to cast depends on roughness (goodbye performance)
	int numReflectionRays = int(sqrt(material.roughness) * 10.0) + 1;
	numReflectionRays = min(4, numReflectionRays); // hello performance

	numReflectionRays *= int(step(material.roughness, 0.5));

	float reflectionFactor = 0.0;
	for(int i = 0; i < numReflectionRays; i++) {
		vec3 reflectDir = mix(cleanReflectDir, generateCosineVector(material.fragNormal), pow2(material.roughness));
		vec3 viewReflectDir = mat3(frx_lastViewMatrix) * reflectDir;

		vec3 screenSpacePos = vec3(texcoord, depth);

		screenSpacePos = lastFrameSceneSpaceToScreenSpace(setupSceneSpacePos(screenSpacePos) + frx_cameraPos - frx_lastCameraPos);
		float prevFrameDepth = texelFetch(hiDepthLevels, ivec2(screenSpacePos.xy*frxu_size), 0).r;

		// TODO some threshold?
		screenSpacePos.z = min(screenSpacePos.z, prevFrameDepth);

		vec3 NDC = screenSpacePos * 2.0 - 1.0;
		vec4 D = frx_lastProjectionMatrix * vec4(viewReflectDir, 0.0);
		vec3 windowSpaceDir = normalize(
			(D.xyz - NDC.xyz * D.w) * vec3(frxu_size, 1.0)
		);
		vec3 windowSpacePos = screenSpacePos * vec3(frxu_size, 1.0);
		windowSpacePos.z -= max(0.0, windowSpaceDir.z * 4.0 * exp(material.roughness*2.0));
		windowSpacePos.z -= 1.0 / 1000000.0;

		float hitDepth;

		bool hit = raytrace(
			windowSpacePos,
			windowSpaceDir,
			40,
			hiDepthLevels,
			hitDepth
		);

		hit = hit && 1.0/(1.0-windowSpacePos.z)-1.0/(1.0-hitDepth) < 48.0;

		if(hit) {
			reflectColor += texelFetch(reflectionColorSampler, ivec2(windowSpacePos.xy), 0).rgb / numReflectionRays;
			reflectionFactor += 1.0 / numReflectionRays;
		}
	}

	// Handle sky reflections
	ambientReflectionColor.rgb *= mix(1.0, pow2(material.vanillaAo) * material.skyLight, material.roughness);

	reflectColor += ambientReflectionColor * (1.0 - reflectionFactor);

	#ifdef REALISTIC_METALS
		color *= mix(vec3(1.0), reflectColor, step(0.999, material.f0) * 0.5);
	#endif

	color = mix(color, reflectColor, reflectance * step(material.f0, 0.999));
}

void applyDarknessAndBlindness(
	inout vec3 color,
	in sampler2D uniformSampler,
	in vec3 sceneSpacePos
) {
	float smoothedBlindnessFactor = texelFetch(uniformSampler, ivec2(0, 0), 0).r;
	float smoothedDarknessFactor = texelFetch(uniformSampler, ivec2(1, 0), 0).r;
	float smoothedDarknessPulseFactor = texelFetch(uniformSampler, ivec2(2, 0), 0).r;

	float blockDistance = rcp(inversesqrt(dot(sceneSpacePos, sceneSpacePos)));

	color = mix(color, vec3(0.0), smoothstep(0.0, 10.0, blockDistance) * smoothedBlindnessFactor);
	color = mix(color, vec3(0.0), (smoothstep(0.0, 5.0 + 20.0 * smoothedDarknessPulseFactor, blockDistance) * 0.5 + 0.5) * smoothedDarknessFactor);
}

// Used for tracing against sky
float rayPlaneIntersection(vec3 rayPos, vec3 rayDir, vec3 planeNormal, float planeHeight) {
	return -(dot(rayPos, planeNormal) + planeHeight) / dot(rayDir, planeNormal);
}

float getVolumetricLightFactor(in vec3 sceneSpacePos, in vec3 viewDir) {
	vec3 startPos = vec3(0.0);
	vec3 endPos = viewDir * min(frx_viewDistance, length(sceneSpacePos));

	const int volumetricLightSteps = 10;
	// vec3 rayPos = startPos;
	vec3 rayStep = (endPos - startPos) / float(volumetricLightSteps);

	float volumetricLightFactor = 0.0;
	for(int i = 0; i < volumetricLightSteps; i++) {
		// rayPos += rayStep;
		vec3 rayPos = startPos + rayStep * (i + interleavedGradient());

		float shadowFactor = getShadowFactor(
			rayPos,
			vec3(0.0), // vertex normal offset: not needed
			0.0, // sss amount
			false, // do pcss?
			1, // shadow samples
			u_shadow_tex,
			u_shadow_map
		);

		volumetricLightFactor += shadowFactor / float(volumetricLightSteps);
	}

	return volumetricLightFactor;// * distance(startPos, endPos);
}

vec3 getAerialPerspective(in vec3 viewDir, in float blockDistance) {
	vec3 aerialPerspective = vec3(0.0);

	vec3 tdata = getTimeOfDayFactors();
	float raymarchSteps = mix(32.0, 16.0, tdata.z);

	float tMax = minecraftToAtmosphereUnitScale * blockDistance / 1e6;

	float mieScatteringAmount = getVolumetricLightFactor(viewDir * blockDistance, viewDir);//smoothstep(30.0, 80.0, blockDistance);

	if(tdata.x + tdata.z > 0.0) {
		aerialPerspective += raymarchScattering(getSkyViewPos(), viewDir, getSunVector(), tMax, raymarchSteps, mieScatteringAmount, u_transmittance, u_multiscattering, SUN_COLOR);
	}
	
	if(tdata.y + tdata.z > 0.0) {
		aerialPerspective += nightAdjust(raymarchScattering(getSkyViewPos(), viewDir, getMoonVector(), tMax, raymarchSteps, mieScatteringAmount, u_transmittance, u_multiscattering, MOON_COLOR));
	}

	return aerialPerspective * 7.5;
}

vec3 getVolumetricLight(in vec3 sceneSpacePos, in vec3 viewDir, in float depth) {
	// if (depth == 1.0) {
	// 	return vec3(0.0);
	// }

	vec3 vlColor = 8.0 * getValFromTLUT(u_transmittance, getSkyViewPos(), frx_skyLightVector);

	if(frx_worldIsMoonlit == 1) {
		vlColor = nightAdjust(vlColor);
	}

	if(frx_cameraInWater == 1) {
		vlColor *= normalize(WATER_COLOR);
	}

	float VdotL = (dot(viewDir, frx_skyLightVector));
	float phase = getMiePhase(VdotL, 0.5);

	return 0.001 * vlColor * getVolumetricLightFactor(sceneSpacePos, viewDir) * phase;
}

void main() {
	initGlobals();
	
	uvec3 samplePacked = texture(u_data, texcoord).xyz;
	
	vec3 color = texture(u_color, texcoord).rgb;
	float depth = texture(u_depth, texcoord).r;

	Material material = unpackMaterial(samplePacked);

	vec3 sceneSpacePos = setupSceneSpacePos(texcoord, depth);
	vec3 viewDir = getViewDir();

	if(depth != 1.0) {
		reflections(
			color,
			u_previous_color,
			u_hi_depth_levels,
			u_skybox,
			material,
			depth,
			sceneSpacePos,
			viewDir
		);

		float blockDistance = length(sceneSpacePos);

		// Fog
		if(!fmn_isModdedDimension) {
			vec3 scattering = vec3(0.0);

			float fogMultiplier = mix(1.0 + 2.0 * frx_smoothedEyeBrightness.y, 15.0, float(frx_worldIsNether));
			fogMultiplier = mix(fogMultiplier, 0.0, float(frx_cameraInWater));
			float transmittance = exp(-blockDistance * minecraftToAtmosphereUnitScale * 1e-6);

			if(frx_worldIsOverworld == 1) {
				float undergroundFactor = linearstep(0.0, 0.5, frx_smoothedEyeBrightness.y);
				undergroundFactor = mix(1.0, undergroundFactor, float(frx_worldHasSkylight));
				
				if (frx_cameraInWater == 0) {
					if (undergroundFactor > 0.01) scattering = getAerialPerspective(viewDir, blockDistance);
					scattering = mix(caveFogColor * 0.1, scattering, undergroundFactor);
				} else {
					// scattering = vec3(getVolumetricLightFactor(sceneSpacePos, viewDir) * blockDistance * 0.025 * WATER_COLOR);
				}
			} else {
				scattering = interpolateCubemap(u_skybox, viewDir).rgb;
			}

			// color += scattering * transmittance;
			// color = vec3(scattering);
			color += scattering;
			//color = mix(scattering, color, transmittance);
		} else {
			color = mix(color, pow(frx_fogColor.rgb, vec3(2.2)), smoothstep(frx_fogStart, frx_fogEnd, blockDistance));
		}

	}

	//#define VOLUMETRIC_LIGHT
	#ifdef VOLUMETRIC_LIGHT
		if(frx_worldHasSkylight == 1) {
			vec3 volumetricLight = getVolumetricLight(sceneSpacePos, viewDir, depth);
			color += volumetricLight;
		}
	#endif

	applyDarknessAndBlindness(color, u_smooth_uniforms, sceneSpacePos);

	fragColor = vec4(color, 1.0);
}