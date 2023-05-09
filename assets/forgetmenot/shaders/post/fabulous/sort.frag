#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/fog.glsl
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

uniform samplerCube u_skybox;

uniform sampler2D u_smoothed_uniforms;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragDepth;

// 1.0 if a is greater than b, 0.0 otherwise.
// Used for blending. 
float getClosestDepth(in float a, inout float b) {
	float isACloser = step(a, b);
	b = mix(b, min(a, b), isACloser);

	return isACloser;
}

float waterHeightNoise(in vec2 uv) {
	//uv += fmn_time;
	//uv *= vec2(1.0, 0.7);
	//uv *= 0.4;

	float noise = 0.0;


	return noise;
}

void main() {
	init();
	vec3 viewDir = getViewDir();
	vec3 tdata = getTimeOfDayFactors();

	// ----------------------------------------------------------------------------------------------------
	// Sample stuff
	uvec3 samplePacked = texture(u_data, texcoord).xyz;

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
	weather_color.rgb = (pow(weather_color.rgb, vec3(2.2)));
	clouds_color.rgb = pow(clouds_color.rgb, vec3(2.2));

	Material material = unpackMaterial(samplePacked);

	vec3 sceneSpacePosBack = setupSceneSpacePos(texcoord, particles_depth);
	vec3 sceneSpacePos = setupSceneSpacePos(texcoord, translucent_depth);

	// ----------------------------------------------------------------------------------------------------
	// Water normals
	if(material.isWater > 0.5 || frx_cameraInWater == 1) {
		#ifdef REALISTIC_WATER
			// Get TBN matrix
			vec3 tangent = normalize(cross(material.vertexNormal, vec3(0.0, 1.0, 1.0)));
			mat3 tbn = mat3(
				tangent,
				cross(material.vertexNormal, tangent),
				material.vertexNormal
			);

			// Math from Balint
			int face = int(dot(max(material.vertexNormal, 0.0), vec3(FACE_EAST, FACE_UP, FACE_SOUTH)) + dot(max(-material.vertexNormal, 0.0), vec3(FACE_WEST, FACE_DOWN, FACE_NORTH)) + 0.5);

			vec3 worldSpacePos = mod(sceneSpacePos + frx_cameraPos, 250.0);
			vec2 uv = frx_faceUv(worldSpacePos, face);

			// const vec2 offset = vec2(0.0, 5e-3);

			// float noiseCenter = waterHeightNoise(uv);

			// Parallaxify
			uv = parallaxMapping(sceneSpacePos, tbn, uv, smoothHash(uv + fmn_time) * 0.1);
			// noiseCenter = waterHeightNoise(uv);

			// float noiseOffsetX = waterHeightNoise(uv + offset.xy);
			// float noiseOffsetY = waterHeightNoise(uv + offset.yx);

			// float deltaX = (noiseOffsetX - noiseCenter) / offset.y * 0.01;
			// float deltaY = (noiseOffsetY - noiseCenter) / offset.y * 0.01;

			vec2 waterNoise = vec2(0.0);
			vec2 waterWindDirection = vec2(fmn_time, fmn_time * 0.25);
			waterNoise += smoothHashDXY(rotate2D(uv, 0.1) * vec2(1.5, 0.5) + waterWindDirection) * 0.5;
			waterNoise += smoothHashDXY(rotate2D(uv, -0.1) * vec2(1.0, 0.2) + waterWindDirection) * 0.75;
			waterNoise += smoothHashDXY(uv * vec2(3.0, 1.0) + 200.0 + waterWindDirection * 4.0) * 0.125;
			waterNoise += smoothHashDXY(uv * vec2(5.0, 1.5) + 400.0 + waterWindDirection * 8.0) * 0.065;
			waterNoise += smoothHashDXY(uv * vec2(5.0, 3.5) + 600.0 - waterWindDirection * 1.0) * 0.065;

			waterNoise *= pow(dot(-material.vertexNormal, viewDir), 1.0 / 4.0);
			waterNoise *= 0.1;

			material.fragNormal = tbn * normalize(
				cross(vec3(2.0, 0.0, waterNoise.x), vec3(0.0, 2.0, waterNoise.y))
			);
		#endif
	}

	// ----------------------------------------------------------------------------------------------------
	// Refractions
	vec4 main_color; {
		// refraction is not even close to physical, just as these indices
		const float refractiveInidices[3] = float[3](
			1.1, 1.3, 1.5
		);

		for(int channel = 0; channel < 3; ++channel) {
			vec3 normDiff = material.fragNormal - material.vertexNormal;
			float normDiffLength = length(normDiff);

			vec3 viewDirRefracted = refract(
				viewDir,
				normDiff / normDiffLength,
				1.0 / refractiveInidices[channel]
			);

			vec2 refractCoord = mix(
				texcoord,
				sceneSpaceToScreenSpace(sceneSpacePosBack + viewDirRefracted * normDiffLength * 2.0).xy,
				clamp01(sign(particles_depth - translucent_depth))
			);

			main_color[channel] = texture(u_main_color, refractCoord)[channel];
		}
		main_color.a = 1.0;
	}
	float main_depth = texture(u_main_depth, texcoord).r;

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

	sceneSpacePosBack = setupSceneSpacePos(texcoord, main_depth);
	sceneSpacePos = setupSceneSpacePos(texcoord, composite_depth);

	// Initialize fog transmittance used for bloomy fog
	float fogTransmittance = 1.0;

	// ----------------------------------------------------------------------------------------------------
	// Water blending
	if(material.isWater > 0.5 || frx_cameraInWater == 1) {
		// These should eventually be configurable
		float waterFogDistance = mix(distance(sceneSpacePosBack, sceneSpacePos), length(sceneSpacePos * 0.3), float(frx_cameraInWater));
		waterFogDistance = max(waterFogDistance, 0.01);

		float sunLightFactor = linearstep(0.0, 0.2, frx_skyLightVector.y);

		vec3 underwaterFogColor = WATER_COLOR * sunLightFactor;
		underwaterFogColor *= (1.0 + 3.0 * getMiePhase(dot(viewDir, frx_skyLightVector), 0.75) * sunLightFactor);
		underwaterFogColor = max(underwaterFogColor, vec3(0.01));

		vec3 waterFogColor = mix(translucent_color.rgb, underwaterFogColor, frx_cameraInWater);

		// Water absorption
		composite *= mix(fNormalize(waterFogColor), vec3(1.0), exp(-waterFogDistance * 2.0));
		
		// Water scattering
		float waterFogTransmittance = exp(-waterFogDistance * (WATER_DIRT_AMOUNT));
		
		if(frx_cameraInFluid == 1) fogTransmittance = min(fogTransmittance, waterFogTransmittance);
		
		composite = mix(waterFogColor * max(material.skyLight, frx_smoothedEyeBrightness.y), composite, waterFogTransmittance * 0.99 + 0.01);
	}
	
	// ----------------------------------------------------------------------------------------------------
	// Reflections
	if(min_depth < 1.0 && (material.roughness < 0.95 || material.f0 > 0.99)) {
		vec3 viewSpacePos = setupViewSpacePos(texcoord, composite_depth);

		vec3 reflectColor = vec3(0.0);
		vec3 reflectance = getReflectance(vec3(material.f0 * material.f0), clamp01(dot(-material.fragNormal, viewDir)));

		vec3 cleanReflectDir = reflect(viewDir, material.fragNormal);
		cleanReflectDir = mix(cleanReflectDir, reflect(viewDir, material.vertexNormal), step(dot(cleanReflectDir, material.vertexNormal), 0.0));

		int numReflectionRays = int(sqrt(material.roughness) * 10.0) + 1;
		float reflectionFactor = 0.0;
		for(int i = 0; i < numReflectionRays; i++) {
			vec3 reflectDir = generateCosineVector(cleanReflectDir, material.roughness);
			vec3 viewReflectDir = frx_normalModelMatrix * reflectDir;

			bool hit = false;
			vec3 hitPos;

			vec3 windowSpacePos = vec3(texcoord, composite_depth) * vec3(frxu_size, 1.0);
			vec3 windowSpaceDir = normalize(
				(viewSpaceToScreenSpace(viewSpacePos + viewReflectDir) - vec3(texcoord, composite_depth)) * vec3(frxu_size, 1.0)
			);

			if(viewSpacePos.z + viewReflectDir.z < 0.0) {
				hit = raytrace(
					windowSpacePos,
					windowSpaceDir,
					40,
					u_depths,
					hitPos
				);

				// Reproject reflection
				hitPos = lastFrameSceneSpaceToScreenSpace(setupSceneSpacePos(hitPos) + frx_cameraPos - frx_lastCameraPos);

				hit = hit && clamp01(hitPos.xy) == hitPos.xy;
			}

			if(hit) {
				reflectColor += texelFetch(u_previous_color, ivec2(hitPos.xy * frxu_size), 0).rgb / numReflectionRays;
				reflectionFactor += 1.0 / numReflectionRays;
			}
		}

		// Handle sky reflections
		vec3 ambientReflectionColor = textureLod(u_skybox, cleanReflectDir, 7.0 * rcp(inversesqrt(material.roughness))).rgb;
		ambientReflectionColor.rgb *= mix(1.0, pow2(material.vanillaAo) * material.skyLight, material.roughness);

		// blocklight contribution
		ambientReflectionColor = max(blockLightColor * pow4(material.blockLight) * pow(dot(material.vertexNormal, material.fragNormal), 300.0), ambientReflectionColor.rgb * material.skyLight);

		reflectColor += ambientReflectionColor * (1.0 - reflectionFactor);

		composite *= mix(vec3(1.0), reflectColor, step(0.999, material.f0));
		composite = mix(composite, reflectColor, reflectance * step(material.f0, 0.999));


		// vec3 reflectDir = generateCosineVector(cleanReflectDir, material.roughness);
		
		// vec3 hitPos;
		// bool hit = false;

		// if(material.roughness < 0.5) {
		// 	vec3 viewReflectDir = frx_normalModelMatrix * reflectDir;

		// 	vec3 pos_ws = sceneSpaceToScreenSpace(sceneSpacePos) * vec3(frxu_size, 1.0);
		// 	vec3 dir_ws = normalize(
		// 		(
		// 			viewSpaceToScreenSpace(viewSpacePos + viewReflectDir) -
		// 			vec3(texcoord, min_depth)
		// 		) * vec3(frxu_size, 1.0)
		// 	);

		// 	if((viewSpacePos + viewReflectDir).z < 0.0) {
		// 		hit = raytrace(
		// 			pos_ws,
		// 			dir_ws,
		// 			40,
		// 			u_depths,
		// 			hitPos
		// 		);
		// 	}

		// 	// Reflection reprojection
		// 	vec3 hitPosScene = setupSceneSpacePos(hitPos);
		// 	hitPos = lastFrameSceneSpaceToScreenSpace(hitPosScene + frx_cameraPos - frx_lastCameraPos);
			
		// 	// check if reprojected hitPos is out of buffer
		// 	if(
		// 		any(greaterThanEqual(hitPos.xy, ivec2(1.0))) ||
		// 		any(lessThan(hitPos.xy, ivec2(0.0)))
		// 	) {
		// 		hit = false;
		// 	}
		// }
		
		// if(hit) {
		// 	reflectColor = texelFetch(u_previous_color, ivec2(hitPos.xy * frxu_size), 0).rgb;
		// } else {
		// 	vec4 skybox = textureLod(u_skybox, cleanReflectDir, 10.0 * rcp(inversesqrt(material.roughness)));
		// 	skybox.rgb = mix(skybox.rgb, WATER_COLOR, float(frx_cameraInWater));
			
		// 	// Rough material should get more conservative skylight
		// 	skybox.rgb *= mix(1.0, pow2(material.vanillaAo) * material.skyLight, material.roughness);
		// 	//skybox += 100.0 * pow(clamp01(dot(cleanReflectDir, (frx_skyLightVector + 0*viewDir))), 128.0);

		// 	reflectColor = max(blockLightColor * pow4(material.blockLight) * pow(dot(material.vertexNormal, material.fragNormal), 300.0), skybox.rgb * material.skyLight);
		// }

		// composite *= mix(vec3(1.0), reflectColor, step(0.999, material.f0));
		// composite = mix(composite, reflectColor, reflectance * step(material.f0, 0.999));
	}

	vec3 atmosphericColor = textureLod(u_skybox, viewDir, 7.0 - 2.0 * pow4(dot(viewDir, frx_skyLightVector))).rgb;

	float blockDistance = min(512.0, rcp(inversesqrt(dot(sceneSpacePos, sceneSpacePos))));

	// ----------------------------------------------------------------------------------------------------
	// Fog
	#ifdef FOG
		if(!isModdedDimension) {
			if(frx_cameraInFluid == 0) {
				float undergroundFactor = linearstep(0.0, 0.5, max(frx_eyeBrightness.y, material.skyLight));
				undergroundFactor = mix(1.0, undergroundFactor, float(frx_worldHasSkylight));

				FogProfile fp = getFogProfile(undergroundFactor);

				float atmosphericFogTransmittance = exp2(-blockDistance / 2500.0 * fp.density);

				vec3 atmosphericFogScattering = atmosphericColor;
				//if(frx_worldHasSkylight == 1) atmosphericFogScattering *= 4.0;

				atmosphericFogScattering = mix(caveFogColor, atmosphericFogScattering, undergroundFactor);

				atmosphericFogTransmittance = mix(atmosphericFogTransmittance, 1.0, floor(composite_depth));

				composite = mix(atmosphericFogScattering, composite, atmosphericFogTransmittance);
			}
		} else {
			if(composite_depth != 1.0) composite = mix(composite, pow(frx_fogColor.rgb, vec3(2.2)), smoothstep(frx_fogStart, frx_fogEnd, length(sceneSpacePos)));
		}
	#else
		//fogTransmittance = 1.0;
	#endif

	// ----------------------------------------------------------------------------------------------------
	// Weather blending
	composite = mix(composite, weather_color.rgb * 40.0 * frx_luminance(atmosphericColor), weather_color.a * step(weather_depth, composite_depth) * 0.5);


	// ----------------------------------------------------------------------------------------------------
	// Blindness and darkness fog effects
	float smoothedBlindnessFactor = texelFetch(u_smoothed_uniforms, ivec2(0, 0), 0).r;
	float smoothedDarknessFactor = texelFetch(u_smoothed_uniforms, ivec2(1, 0), 0).r;
	float smoothedDarknessPulseFactor = texelFetch(u_smoothed_uniforms, ivec2(2, 0), 0).r;

	composite = mix(composite, vec3(0.0), smoothstep(0.0, 10.0, blockDistance) * smoothedBlindnessFactor);
	composite = mix(composite, vec3(0.0), smoothstep(0.0, 5.0 + 20.0 * smoothedDarknessPulseFactor, blockDistance) * smoothedDarknessFactor);

	// ----------------------------------------------------------------------------------------------------
	// Writing to buffers



	fragColor = vec4(composite, fogTransmittance);
	fragDepth = vec4(composite_depth);
}
