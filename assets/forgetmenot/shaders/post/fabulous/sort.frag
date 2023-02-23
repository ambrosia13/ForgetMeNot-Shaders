#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/packing.glsl
#include forgetmenot:shaders/lib/inc/material.glsl
#include forgetmenot:shaders/lib/inc/lighting.glsl
#include forgetmenot:shaders/lib/inc/raytrace.glsl

uniform sampler2D u_previous_color;

uniform sampler2D u_main_color;
uniform sampler2D u_main_depth;
uniform sampler2D u_translucent_color;
uniform sampler2D u_translucent_depth;
uniform sampler2D u_entity_color;
uniform sampler2D u_entity_depth;
uniform sampler2D u_weather_color;
uniform sampler2D u_weather_depth;
uniform sampler2D u_clouds_color;
uniform sampler2D u_clouds_depth;
uniform sampler2D u_particles_color;
uniform sampler2D u_particles_depth;

uniform sampler2D u_depths;

uniform usampler2D u_data;
uniform sampler2D u_vertex_normal;

uniform samplerCube u_skybox;
uniform sampler2D u_multiscattering;

uniform sampler2DArrayShadow u_shadow_map;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// 1.0 if a is greater than b, 0.0 otherwise.
// Used for blending. 
float getClosestDepth(const in float a, inout float b) {
	float isACloser = step(a, b);
	b = mix(b, min(a, b), isACloser);

	return isACloser;
}

void main() {
	init();
	vec3 viewDir = getViewDir();
	vec3 tdata = getTimeOfDayFactors();

	// ----------------------------------------------------------------------------------------------------
	// Sample stuff
	uvec3 samplePacked = texture(u_data, texcoord).xyz;

	vec3 vertexNormal = texture(u_vertex_normal, texcoord).xyz;

	vec4 translucent_color = texture(u_translucent_color, texcoord.xy);
	float translucent_depth = texture(u_translucent_depth, texcoord).r;

	vec4 particles_color = texture(u_particles_color, texcoord);
	float particles_depth = texture(u_particles_depth, texcoord).r;

	vec4 entity_color = texture(u_entity_color, texcoord);
	float entity_depth = texture(u_entity_depth, texcoord).r;

	vec4 weather_color = texture(u_weather_color, texcoord);
	float weather_depth = texture(u_weather_depth, texcoord).r;

	vec4 clouds_color = texture(u_clouds_color, texcoord);
	float clouds_depth = texture(u_clouds_depth, texcoord).r;

	// ----------------------------------------------------------------------------------------------------
	// Fix up samples
	vertexNormal = vertexNormal * 2.0 - 1.0;

	weather_color.rgb = (pow(weather_color.rgb, vec3(2.2)));

	clouds_color.rgb = pow(clouds_color.rgb, vec3(2.2));

	Material material = unpackMaterial(samplePacked);

	// ----------------------------------------------------------------------------------------------------
	// Refractions
	vec3 sceneSpacePosBack = setupSceneSpacePos(texcoord, particles_depth);
	vec3 sceneSpacePos = setupSceneSpacePos(texcoord, translucent_depth);

	vec3 viewDirRefracted = refract(viewDir, material.fragNormal - vertexNormal, 1.0 / 1.333);
	vec2 refractCoord = mix(texcoord, sceneSpaceToScreenSpace(sceneSpacePosBack + viewDirRefracted).xy, clamp01(sign(particles_depth - translucent_depth)));

	vec4 main_color = texture(u_main_color, refractCoord);
	float main_depth = texture(u_main_depth, refractCoord).r;

	translucent_depth = texture(u_translucent_depth, refractCoord).r;
	particles_depth = texture(u_particles_depth, refractCoord).r;

	float max_depth = max(max(translucent_depth, particles_depth), main_depth);
	float min_depth = min(min(translucent_depth, particles_depth), main_depth);

	vec3 maxSceneSpacePos = setupSceneSpacePos(texcoord, max_depth);
	vec3 minSceneSpacePos = setupSceneSpacePos(texcoord, min_depth);

	// ----------------------------------------------------------------------------------------------------
	// Fabulous blending
	vec3 composite = main_color.rgb;
	float composite_depth = main_depth;
	composite = mix(composite, translucent_color.rgb, translucent_color.a * getClosestDepth(translucent_depth, composite_depth) * step(material.isWater, 0.5)); // that last part disables water blending
	composite = mix(composite, particles_color.rgb, particles_color.a * getClosestDepth(particles_depth, composite_depth));
	composite = mix(composite, entity_color.rgb, entity_color.a * getClosestDepth(entity_depth, composite_depth));
	composite = mix(composite, weather_color.rgb, weather_color.a * step(weather_depth, composite_depth));

	sceneSpacePosBack = setupSceneSpacePos(texcoord, main_depth);
	sceneSpacePos = setupSceneSpacePos(texcoord, composite_depth);

	// ----------------------------------------------------------------------------------------------------
	// Water blending
	if(material.isWater > 0.5 || frx_cameraInWater == 1) {
		// These should eventually be configurable
		const float WATER_DIRT_AMOUNT = 0.25;
		const vec3 WATER_COLOR = vec3(0.0, 0.20, 0.25);

		float waterFogDistance = mix(distance(sceneSpacePosBack, sceneSpacePos), length(sceneSpacePos * 0.3), float(frx_cameraInWater));
		waterFogDistance = max(waterFogDistance, 0.01);

		float sunLightFactor = linearstep(0.0, 0.2, frx_skyLightVector.y);

		vec3 underwaterFogColor = WATER_COLOR * sunLightFactor;
		underwaterFogColor *= (1.0 + 3.0 * getMiePhase(dot(viewDir, frx_skyLightVector), 0.75) * sunLightFactor);
		underwaterFogColor = max(underwaterFogColor, vec3(0.01));

		vec3 waterFogColor = mix(translucent_color.rgb, underwaterFogColor, frx_cameraInWater);

		// Water absorption
		composite *= mix(fNormalize(waterFogColor), vec3(1.0), exp(-waterFogDistance));
		
		// Water scattering
		composite = mix(waterFogColor * max(material.skyLight, frx_smoothedEyeBrightness.y), composite, exp(-waterFogDistance * (WATER_DIRT_AMOUNT + 0.4 * frx_cameraInWater)) * 0.99 + 0.01);
	}

	// ----------------------------------------------------------------------------------------------------
	// Reflections
	if(min_depth < 1.0 && (material.roughness < 0.95 || material.f0 > 0.99)) {
		vec3 viewSpacePos = setupViewSpacePos(texcoord, min_depth);

		vec3 reflectColor = vec3(0.0);
		vec3 reflectance = getReflectance(vec3(material.f0), clamp01(dot(-material.fragNormal, viewDir)), material.roughness);

		vec3 cleanReflectDir = reflect(viewDir, material.fragNormal);
		cleanReflectDir = mix(cleanReflectDir, reflect(viewDir, vertexNormal), step(dot(cleanReflectDir, vertexNormal), 0.0));

		vec3 reflectDir = generateCosineVector(cleanReflectDir, material.roughness);
		
		vec3 hitPos;
		bool hit = false;

		if(material.roughness < 0.5) {
			vec3 viewReflectDir = frx_normalModelMatrix * reflectDir;

			vec3 pos_ws = vec3(gl_FragCoord.xy, min_depth);
			vec3 dir_ws = normalize(
				(
					viewSpaceToScreenSpace(viewSpacePos + viewReflectDir) -
					vec3(texcoord, min_depth)
				) * vec3(frxu_size, 1.0)
			);

			if((viewSpacePos + viewReflectDir).z < 0.0) {
				hit = raytrace(
					pos_ws,
					dir_ws,
					40,
					u_depths,
					hitPos
				);
			}

			// Reflection reprojection
			vec3 hitPosScene = setupSceneSpacePos(hitPos);
			hitPos = lastFrameSceneSpaceToScreenSpace(hitPosScene + frx_cameraPos - frx_lastCameraPos);
		}
		
		if(hit) {
			reflectColor = texelFetch(u_previous_color, ivec2(hitPos.xy * frxu_size), 0).rgb;
		} else {
			vec4 skybox = textureLod(u_skybox, cleanReflectDir, 10.0 * rcp(inversesqrt(material.roughness)));
			
			// Rough material should get more conservative skylight
			skybox.rgb *= mix(1.0, pow2(material.vanillaAo) * material.skyLight, material.roughness);
			//skybox += 100.0 * pow(clamp01(dot(cleanReflectDir, (frx_skyLightVector + 0*viewDir))), 128.0);

			reflectColor = skybox.rgb * material.skyLight;
		}

		composite *= mix(vec3(1.0), reflectColor, step(0.999, material.f0));
		composite = mix(composite, reflectColor, reflectance * step(material.f0, 0.999));
	}

	// ----------------------------------------------------------------------------------------------------
	// Fog
	{
		float undergroundFactor = max(frx_smoothedEyeBrightness.y, material.skyLight);

		if(frx_cameraInWater == 0) {
			float blockDistance = min(frx_viewDistance, rcp(inversesqrt(dot(sceneSpacePos, sceneSpacePos))));

			vec3 fogPos = viewDir * min(max(256.0, frx_viewDistance), blockDistance);

			vec3 startPos = fogPos;
			float vlFactor = 0.0;

			// const int VOLUMETRIC_FOG_STEPS = 30;
			// for(int i = 0; i < VOLUMETRIC_FOG_STEPS; i++) {
			// 	fogPos -= fogPos / (VOLUMETRIC_FOG_STEPS) * interleavedGradient();

			// 	vec3 samplePos = fogPos + frx_cameraPos;
			// 	fogAccumulator += 2.0 * smoothstep(0.0 + smoothstep(50.0, 120.0, samplePos.y), 1.0, fbm3d((samplePos) * 0.01, 4, 3.0, 0.02)) / VOLUMETRIC_FOG_STEPS;
			// }

			#ifdef VOLUMETRIC_FOG
				const int VOLUMETRIC_FOG_STEPS = 10;
				for(int i = 0; i < VOLUMETRIC_FOG_STEPS; i++) {
					fogPos -= fogPos / (VOLUMETRIC_FOG_STEPS) * interleavedGradient();

					int cascade;
					vec3 shadowPos = setupShadowPos(fogPos, vec3(0.0), cascade);
					vlFactor += texture(u_shadow_map, vec4(shadowPos.xy, cascade, shadowPos.z)) / VOLUMETRIC_FOG_STEPS;
				}

				vlFactor *= distance(fogPos, startPos) / (frx_viewDistance * 0.25);
			#else
				vlFactor = 0.0;
			#endif

			// if(min_depth == 1.0) {
			// 	float distToPlanet = rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM);
			// 	blockDistance = 1000.0 * length(viewDir.xz / (viewDir.y + length(viewDir.xz) * 0.015)) * step(0.0, distToPlanet);
			// }
			float fogAccumulator = length(max(0.0, blockDistance - 20.0)) / 1500.0 * (1.0 - floor(min_depth));

			float fogDensity = mix(1.0, 3.0, linearstep(0.1, -0.1, getSunVector().y));
			fogDensity *= mix(1.0, 6.0, fmn_rainFactor);
			fogDensity = mix(3.0, fogDensity, undergroundFactor);
			fogDensity = mix(fogDensity, 10.0, float(frx_worldIsNether));

			float fogTransmittance = exp2(-fogAccumulator * fogDensity);
			
			vec3 fogScattering = vec3(0.0);
			if(frx_worldHasSkylight == 1) {
				vec3 fogViewPos = skyViewPos + vec3(0.0, 0.000001 * (sceneSpacePos.y + frx_cameraPos.y - 60.0), 0.0);
				fogScattering = getValFromMultiScattLUT(u_multiscattering, fogViewPos, getSunVector()) + nightAdjust(getValFromMultiScattLUT(u_multiscattering, fogViewPos, getMoonVector()));
				fogScattering *= 300.0;

				fogScattering += vlFactor * 0.15 * textureLod(u_skybox, frx_skyLightVector, 2).rgb * getMiePhase(dot(viewDir, frx_skyLightVector), 0.9) * frx_skyLightTransitionFactor;
				fogScattering += vlFactor * 0.15 * textureLod(u_skybox, -frx_skyLightVector, 2).rgb * getMiePhase(dot(viewDir, -frx_skyLightVector), 0.9) * frx_skyLightTransitionFactor;

				fogScattering = mix(caveFogColor, fogScattering, undergroundFactor);
			} else {
				fogScattering = textureLod(u_skybox, viewDir, 7).rgb;
			}

			composite = mix(fogScattering, composite, fogTransmittance);
		}
	}

	fragColor = vec4(composite, 1.0);
}
