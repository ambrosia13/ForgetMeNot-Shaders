#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/utility.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/packing.glsl
#include forgetmenot:shaders/lib/inc/material.glsl
#include forgetmenot:shaders/lib/inc/lighting.glsl
#include forgetmenot:shaders/lib/inc/raytrace.glsl

uniform sampler2D u_previous_color;

uniform sampler2D u_solid_color;
uniform sampler2D u_solid_depth;
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

uniform sampler2D u_hi_depth_levels;

uniform usampler2D u_data;

uniform samplerCube u_skybox;

uniform sampler2D u_smooth_uniforms;

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

void insertLayer(inout vec3 background, inout float backgroundDepth, in vec4 foreground, in float foregroundDepth) {
	background = mix(background, background * (1.0 - foreground.a) + foreground.rgb * foreground.a, getClosestDepth(foregroundDepth, backgroundDepth));
}

void main() {
	initGlobals();
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

	// ----------------------------------------------------------------------------------------------------
	// Fix up samples
	weatherColor.rgb = pow(weatherColor.rgb, vec3(2.2));
	cloudsColor.rgb = pow(cloudsColor.rgb, vec3(2.2));

	Material material = unpackMaterial(samplePacked);

	vec3 sceneSpacePosBack = setupSceneSpacePos(texcoord, particlesDepth);
	vec3 sceneSpacePos = setupSceneSpacePos(texcoord, translucentDepth);

	float skyboxSharpeningFactor = 2.0 * pow(clamp01(dot(viewDir, frx_skyLightVector)), 8.0);
	skyboxSharpeningFactor *= smoothstep(0.0, 100.0, length(sceneSpacePos));
	skyboxSharpeningFactor = mix(skyboxSharpeningFactor, 0.0, frx_skyLightTransitionFactor);

	vec3 atmosphericColor = textureLod(u_skybox, viewDir, 6.0 - skyboxSharpeningFactor).rgb;
	vec3 atmosphericColorTop = textureLod(u_skybox, vec3(0.0, 1.0, 0.0), 7).rgb;
	float atmosphereBrightness = frx_luminance(atmosphericColorTop);

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
			waterNoise += smoothHashDXY(repeatAndMirrorCoords((uv * vec2(10.0, 1.5) + 600.0 - waterWindDirection) / 250.0) * 250.0) * 0.125;

			waterNoise *= pow(dot(-material.vertexNormal, viewDir), 1.0 / 3.0);
			waterNoise *= 0.1;

			material.fragNormal = tbn * normalize(
				cross(vec3(2.0, 0.0, waterNoise.x), vec3(0.0, 2.0, waterNoise.y))
			);
		}
	#endif

	// ----------------------------------------------------------------------------------------------------
	// Refractions
	vec4 solidColor; 
	float solidDepth = texture(u_solid_depth, texcoord).r;

	float refractedDepthBack = 1.0;
	float refractedDepthFront = 1.0;
	
	if(solidDepth < 1.0 && material.fragNormal != material.vertexNormal) {
		const float angleMultiplier[3] = float[3](
			1.1, 1.3, 1.5
		);
		vec2 refractCoord;

		#define DEPTH_AWARE_REFRACTIONS
		#ifdef DEPTH_AWARE_REFRACTIONS
			vec3 crss = normalize(cross(material.fragNormal, material.vertexNormal));
			float angle = acos(dot(material.fragNormal, material.vertexNormal));

			for(int channel = 0; channel < 3; ++channel) {
				vec3 viewDirRefracted = rotationMatrix3D(crss, angle * angleMultiplier[channel]) * viewDir;
				vec3 sceneSpacePosBackRefracted = sceneSpacePos + viewDirRefracted * distance(sceneSpacePosBack, sceneSpacePos);

				refractCoord = mix(
					texcoord,
					sceneSpaceToScreenSpace(sceneSpacePosBackRefracted).xy,
					clamp01(sign(solidDepth - translucentDepth))
				);

				solidColor[channel] = texture(u_solid_color, refractCoord)[channel];
			}
		#else
			vec3 normDiff = material.fragNormal - material.vertexNormal;
			float normDiffLength = length(normDiff);

			for(int channel = 0; channel < 3; ++channel) {
				vec3 viewDirRefracted = refract(
					viewDir,
					normDiff / normDiffLength,
					1.0 / angleMultiplier[channel]
				);

				refractCoord = mix(
					texcoord,
					sceneSpaceToScreenSpace(sceneSpacePosBack + viewDirRefracted * normDiffLength * 4.0).xy,
					clamp01(sign(solidDepth - translucentDepth))
				);

				solidColor[channel] = texture(u_solid_color, refractCoord)[channel];
			}
		#endif

		refractedDepthBack = texture(u_solid_depth, refractCoord).r;
		refractedDepthFront = texture(u_translucent_depth, refractCoord).r;

		solidColor.a = 1.0;
	} else {
		solidColor = texture(u_solid_color, texcoord);

		refractedDepthBack = solidDepth;
		refractedDepthFront = translucentDepth;
	}

	// ----------------------------------------------------------------------------------------------------
	// Fabulous blending
	vec3 composite = solidColor.rgb;
	float compositeDepth = solidDepth;

	// Disable blending on water, because water is blended separately
	translucentColor.a *= step(material.isWater, 0.5);

	insertLayer(composite, compositeDepth, translucentColor, translucentDepth);
	insertLayer(composite, compositeDepth, particlesColor, particlesDepth);
	insertLayer(composite, compositeDepth, entityColor, entityDepth);

	sceneSpacePosBack = setupSceneSpacePos(texcoord, refractedDepthBack);
	sceneSpacePos = setupSceneSpacePos(texcoord, compositeDepth);

	// Initialize fog transmittance used for bloomy fog
	float fogTransmittance = 1.0;

	// ----------------------------------------------------------------------------------------------------
	// Water effects
	if(frx_cameraInWater == 1) {
		float waterFogDistance = length(sceneSpacePos);
		vec3 waterFogColor = WATER_COLOR;

		composite *= mix(normalize(waterFogColor), vec3(1.0), exp(-waterFogDistance * 0.2));
		composite = mix(waterFogColor * atmosphereBrightness * 1.5, composite, exp(-waterFogDistance * WATER_DIRT_AMOUNT));

		vec3 refractedViewDir = refract(viewDir, material.fragNormal, 1.33);

		if(solidDepth == 1.0) composite = textureLod(u_skybox, refractedViewDir, 0.0).rgb;
		if(refractedViewDir.y <= 0.001 && material.isWater > 0.5) {
			composite = waterFogColor;
			material.f0 = 0.95;
		}

		composite = mix(composite, waterFogColor, floor(compositeDepth));
	} else if(material.isWater > 0.5) {
		// These should eventually be configurable
		float waterFogDistance = distance(sceneSpacePosBack, sceneSpacePos);

		vec3 waterFogColor = translucentColor.rgb;

		// Water absorption
		composite *= mix(normalize(waterFogColor), vec3(1.0), exp(-waterFogDistance * 0.5));
		
		// Water scattering
		float waterFogTransmittance = exp(-waterFogDistance * (WATER_DIRT_AMOUNT));
				
		composite = mix(waterFogColor, composite, waterFogTransmittance * 0.99 + 0.01);
	}

	// ----------------------------------------------------------------------------------------------------
	// Reflections
	if(compositeDepth < 1.0 && (material.roughness < 0.95 || material.f0 > 0.99)) {
		vec3 reflectColor = vec3(0.0);
		vec3 reflectance = getReflectance(vec3(material.f0 * material.f0), clamp01(dot(-material.fragNormal, viewDir)), 0.0);

		vec3 cleanReflectDir = reflect(viewDir, material.fragNormal);
		cleanReflectDir = mix(cleanReflectDir, reflect(viewDir, material.vertexNormal), step(dot(cleanReflectDir, material.vertexNormal), 0.0));

		vec3 ambientReflectionColor = WATER_COLOR * atmosphereBrightness;
		if(frx_cameraInWater == 0) ambientReflectionColor = textureLod(u_skybox, cleanReflectDir, 7.0 * rcp(inversesqrt(material.roughness))).rgb;
		

		// number of rays to cast depends on roughness (goodbye performance)
		int numReflectionRays = int(sqrt(material.roughness) * 10.0) + 1;
		numReflectionRays = min(4, numReflectionRays); // hello performance

		numReflectionRays *= int(step(material.roughness, 0.5));

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
				u_hi_depth_levels,
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
		ambientReflectionColor = max(fmn_blockLightColor * pow4(material.blockLight) * pow(dot(material.vertexNormal, material.fragNormal), 300.0), ambientReflectionColor.rgb * material.skyLight);

		reflectColor += ambientReflectionColor * (1.0 - reflectionFactor);

		#ifdef REALISTIC_METALS
			composite *= mix(vec3(1.0), reflectColor, step(0.999, material.f0));
		#endif

		composite = mix(composite, reflectColor, reflectance * step(material.f0, 0.999));
	}

	float blockDistance = rcp(inversesqrt(dot(sceneSpacePos, sceneSpacePos)));
	float fogDistance = min(512.0, blockDistance);

	// ----------------------------------------------------------------------------------------------------
	// Fog
	// #ifdef FOG
	// 	if(!fmn_isModdedDimension) {
	// 		if(frx_cameraInFluid == 0) {
	// 			float undergroundFactor = linearstep(0.0, 0.5, max(frx_smoothedEyeBrightness.y, material.skyLight));
	// 			undergroundFactor = mix(1.0, undergroundFactor, float(frx_worldHasSkylight));

	// 			float atmosphericFogTransmittance = exp2(-fogDistance / fmn_atmosphereParams.blocksPerFogUnit * 4.0);

	// 			vec3 atmosphericFogScattering = atmosphericColor;
	// 			//if(frx_worldHasSkylight == 1) atmosphericFogScattering *= 4.0;

	// 			atmosphericFogScattering = mix(caveFogColor, atmosphericFogScattering, undergroundFactor);

	// 			atmosphericFogTransmittance = mix(atmosphericFogTransmittance, 1.0, floor(compositeDepth));

	// 			composite = mix(atmosphericFogScattering, composite, atmosphericFogTransmittance);

	// 			// Border flog
	// 			float fogFactor = smoothstep(frx_viewDistance - 24.0, frx_viewDistance - 8.0, blockDistance);
	// 			composite = mix(composite, textureLod(u_skybox, viewDir, 0.0).rgb, fogFactor * (1.0 - floor(compositeDepth)));
	// 		}
	// 	} else {
	// 		if(compositeDepth != 1.0) composite = mix(composite, pow(frx_fogColor.rgb, vec3(2.2)), smoothstep(frx_fogStart, frx_fogEnd, length(sceneSpacePos)));
	// 	}
	// #else
	// 	//fogTransmittance = 1.0;
	// #endif

	// ----------------------------------------------------------------------------------------------------
	// Weather blending
	composite = mix(composite, weatherColor.rgb * 10.0 * frx_luminance(atmosphericColor), weatherColor.a * step(weatherDepth, compositeDepth) * 0.5);


	// ----------------------------------------------------------------------------------------------------
	// Blindness and darkness fog effects
	float smoothedBlindnessFactor = texelFetch(u_smooth_uniforms, ivec2(0, 0), 0).r;
	float smoothedDarknessFactor = texelFetch(u_smooth_uniforms, ivec2(1, 0), 0).r;
	float smoothedDarknessPulseFactor = texelFetch(u_smooth_uniforms, ivec2(2, 0), 0).r;

	composite = mix(composite, vec3(0.0), smoothstep(0.0, 10.0, blockDistance) * smoothedBlindnessFactor);
	composite = mix(composite, vec3(0.0), smoothstep(0.0, 5.0 + 20.0 * smoothedDarknessPulseFactor, blockDistance) * smoothedDarknessFactor);

	// ----------------------------------------------------------------------------------------------------
	// Writing to buffers
	fragColor = vec4(composite, fogTransmittance);
	fragDepth = vec4(compositeDepth);
}
