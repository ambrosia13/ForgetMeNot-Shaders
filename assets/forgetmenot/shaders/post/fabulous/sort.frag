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

// Used for blending: 1.0 if a > b, else 0.0
// Update b to the closer of the two depths
float getClosestDepth(in float a, inout float b) {
	float isACloser = step(a, b);
	b = mix(b, min(a, b), isACloser);

	return isACloser;
}

void insertLayer(inout vec3 background, in vec4 foreground, inout float backgroundDepth, in float foregroundDepth) {
	background = mix(background, background * (1.0 - foreground.a) + foreground.rgb * foreground.a, getClosestDepth(foregroundDepth, backgroundDepth));
}

void main() {
	init();
	vec3 viewDir = getViewDir();
	vec3 tdata = getTimeOfDayFactors();

	// ----------------------------------------------------------------------------------------------------
	// Sample stuff
	uvec3 samplePacked = texture(u_data, texcoord).xyz;

	vec4 translucentColor = texture(u_translucent_color, texcoord.xy);
	float translucentDepth = texture(u_translucent_depth, texcoord).r;

	vec4 particlesColor = texture(u_particles_color, texcoord);
	float particlesDepth = texture(u_particles_depth, texcoord).r;

	vec4 entityColor = texture(u_entity_color, texcoord);
	float entityDepth = texture(u_entity_depth, texcoord).r;

	vec4 weatherColor = texture(u_weather_color, texcoord);
	float weatherDepth = texture(u_weather_depth, texcoord).r;

	vec4 cloudsColor = texture(u_clouds_color, texcoord);
	float cloudsDepth = texture(u_clouds_depth, texcoord).r;

	vec3 atmosphericColor = textureLod(u_skybox, viewDir, 7.0 - 2.0 * pow4(dot(viewDir, frx_skyLightVector))).rgb;

	// ----------------------------------------------------------------------------------------------------
	// Fix up samples
	weatherColor.rgb = pow(weatherColor.rgb, vec3(2.2));
	cloudsColor.rgb = pow(cloudsColor.rgb, vec3(2.2));

	Material material = unpackMaterial(samplePacked);

	vec3 sceneSpacePosBack = setupSceneSpacePos(texcoord, particlesDepth);
	vec3 sceneSpacePos = setupSceneSpacePos(texcoord, translucentDepth);

	// ----------------------------------------------------------------------------------------------------
	// Water normals
	#ifdef REALISTIC_WATER
		if(material.isWater > 0.5 || frx_cameraInWater == 1) {
			// Get TBN matrix
			vec3 tangent = normalize(cross(material.vertexNormal, vec3(0.0, 1.0, 1.0)));
			mat3 tbn = mat3(
				tangent,
				cross(material.vertexNormal, tangent),
				material.vertexNormal
			);

			// Math from Balint
			int face = int(dot(max(material.vertexNormal, 0.0), vec3(FACE_EAST, FACE_UP, FACE_SOUTH)) + dot(max(-material.vertexNormal, 0.0), vec3(FACE_WEST, FACE_DOWN, FACE_NORTH)) + 0.5);

			vec3 worldSpacePos = sceneSpacePos + frx_cameraPos;
			vec2 uv = frx_faceUv(worldSpacePos, face);

			// Parallaxify
			uv = parallaxMapping(sceneSpacePos, tbn, uv, smoothHash(uv + fmn_time) * 0.1);

			vec2 waterNoise = vec2(0.0);
			vec2 waterWindDirection = vec2(fmn_time, fmn_time * 0.25);
			waterNoise += smoothHashDXY(repeatAndMirrorCoords(rotate2D(uv * vec2(1.5, 0.5) + waterWindDirection, radians( 15.0)) / 250.0) * 250.0) * 0.5;
			waterNoise += smoothHashDXY(repeatAndMirrorCoords(rotate2D(uv * vec2(1.0, 0.2) + waterWindDirection, radians(-15.0)) / 250.0) * 250.0) * 0.75;
			waterNoise += smoothHashDXY(repeatAndMirrorCoords((uv * vec2(3.0, 1.0) + 200.0 + waterWindDirection * 4.0) / 250.0) * 250.0) * 0.125;
			waterNoise += smoothHashDXY(repeatAndMirrorCoords((uv * vec2(5.0, 1.5) + 400.0 + waterWindDirection * 8.0) / 250.0) * 250.0) * 0.065;
			waterNoise += smoothHashDXY(repeatAndMirrorCoords((uv * vec2(5.0, 3.5) + 600.0 - waterWindDirection) / 250.0) * 250.0) * 0.065;

			waterNoise *= pow(dot(-material.vertexNormal, viewDir), 1.0 / 4.0);
			waterNoise *= 0.1;

			material.fragNormal = tbn * normalize(
				cross(vec3(2.0, 0.0, waterNoise.x), vec3(0.0, 2.0, waterNoise.y))
			);
		}
	#endif

	// ----------------------------------------------------------------------------------------------------
	// Refractions
	vec4 mainColor; 
	float mainDepth = texture(u_main_depth, texcoord).r;
	
	if(mainDepth < 1.0) {
		// refraction is not even close to physical, just as these indices
		const float refractiveInidices[3] = float[3](
			1.1, 1.3, 1.5
		);

		vec3 normDiff = material.fragNormal - material.vertexNormal;
		float normDiffLength = length(normDiff);

		for(int channel = 0; channel < 3; ++channel) {
			vec3 viewDirRefracted = refract(
				viewDir,
				normDiff / normDiffLength,
				1.0 / refractiveInidices[channel]
			);

			vec2 refractCoord = mix(
				texcoord,
				sceneSpaceToScreenSpace(sceneSpacePosBack + viewDirRefracted * normDiffLength * 2.0).xy,
				clamp01(sign(mainDepth - translucentDepth))
			);

			mainColor[channel] = texture(u_main_color, refractCoord)[channel];
		}
		mainColor.a = 1.0;
	} else {
		mainColor = texture(u_main_color, texcoord);
	}

	// ----------------------------------------------------------------------------------------------------
	// Fabulous blending
	vec3 composite = mainColor.rgb;
	float compositeDepth = mainDepth;

	// Disable blending on water, because water is blended separately
	translucentColor.a *= step(material.isWater, 0.5);

	insertLayer(composite, translucentColor, compositeDepth, translucentDepth);
	insertLayer(composite, particlesColor, compositeDepth, particlesDepth);
	insertLayer(composite, entityColor, compositeDepth, entityDepth);

	sceneSpacePosBack = setupSceneSpacePos(texcoord, mainDepth);
	sceneSpacePos = setupSceneSpacePos(texcoord, compositeDepth);

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

		vec3 waterFogColor = mix(translucentColor.rgb, underwaterFogColor, frx_cameraInWater);

		// Water absorption
		composite *= mix(fNormalize(waterFogColor), vec3(1.0), exp(-waterFogDistance * 2.0));
		
		// Water scattering
		float waterFogTransmittance = exp(-waterFogDistance * (WATER_DIRT_AMOUNT));
		
		if(frx_cameraInFluid == 1) fogTransmittance = min(fogTransmittance, waterFogTransmittance);
		
		composite = mix(waterFogColor * max(material.skyLight, frx_smoothedEyeBrightness.y), composite, waterFogTransmittance * 0.99 + 0.01);
	}
	
	// ----------------------------------------------------------------------------------------------------
	// Reflections
	if(compositeDepth < 1.0 && (material.roughness < 0.95 || material.f0 > 0.99)) {
		vec3 reflectColor = vec3(0.0);
		vec3 reflectance = getReflectance(vec3(material.f0 * material.f0), clamp01(dot(-material.fragNormal, viewDir)));

		vec3 cleanReflectDir = reflect(viewDir, material.fragNormal);
		cleanReflectDir = mix(cleanReflectDir, reflect(viewDir, material.vertexNormal), step(dot(cleanReflectDir, material.vertexNormal), 0.0));

		vec3 ambientReflectionColor = textureLod(u_skybox, cleanReflectDir, 7.0 * rcp(inversesqrt(material.roughness))).rgb;

		// number of rays to cast depends on roughness (goodbye performance)
		int numReflectionRays = int(sqrt(material.roughness) * 10.0) + 1;
		float reflectionFactor = 0.0;
		for(int i = 0; i < numReflectionRays; i++) {
			vec3 reflectDir = generateCosineVector(cleanReflectDir, material.roughness);
			vec3 viewReflectDir = frx_normalModelMatrix * reflectDir;

			vec3 screenSpacePos = vec3(texcoord, compositeDepth);
			vec3 NDC = screenSpacePos * 2.0 - 1.0;
			vec4 D = frx_projectionMatrix * vec4(viewReflectDir, 0.0);
			vec3 windowSpaceDir = normalize(
				(D.xyz - NDC.xyz * D.w) * vec3(frxu_size, 1.0)
			);
			vec3 windowSpacePos = vec3(texcoord, compositeDepth) * vec3(frxu_size, 1.0);

			bool hit = false;
			vec3 hitPos;

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

			if(hit) {
				reflectColor += texelFetch(u_previous_color, ivec2(hitPos.xy * frxu_size), 0).rgb / numReflectionRays;
				reflectionFactor += 1.0 / numReflectionRays;
			}
		}

		// Handle sky reflections
		ambientReflectionColor.rgb *= mix(1.0, pow2(material.vanillaAo) * material.skyLight, material.roughness);

		// blocklight contribution
		ambientReflectionColor = max(blockLightColor * pow4(material.blockLight) * pow(dot(material.vertexNormal, material.fragNormal), 300.0), ambientReflectionColor.rgb * material.skyLight);

		reflectColor += ambientReflectionColor * (1.0 - reflectionFactor);

		composite *= mix(vec3(1.0), reflectColor, step(0.999, material.f0));
		composite = mix(composite, reflectColor, reflectance * step(material.f0, 0.999));
	}

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

				atmosphericFogTransmittance = mix(atmosphericFogTransmittance, 1.0, floor(compositeDepth));

				composite = mix(atmosphericFogScattering, composite, atmosphericFogTransmittance);
			}
		} else {
			if(compositeDepth != 1.0) composite = mix(composite, pow(frx_fogColor.rgb, vec3(2.2)), smoothstep(frx_fogStart, frx_fogEnd, length(sceneSpacePos)));
		}
	#else
		//fogTransmittance = 1.0;
	#endif

	// ----------------------------------------------------------------------------------------------------
	// Weather blending
	composite = mix(composite, weatherColor.rgb * 40.0 * frx_luminance(atmosphericColor), weatherColor.a * step(weatherDepth, compositeDepth) * 0.5);


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
	fragDepth = vec4(compositeDepth);
}
