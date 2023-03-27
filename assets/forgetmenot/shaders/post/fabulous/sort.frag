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
uniform sampler2D u_vertex_normal;

uniform samplerCube u_skybox;
uniform sampler2D u_multiscattering;

uniform sampler2DArrayShadow u_shadow_map;

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

	sceneSpacePosBack = setupSceneSpacePos(texcoord, main_depth);
	sceneSpacePos = setupSceneSpacePos(texcoord, composite_depth);

	// ----------------------------------------------------------------------------------------------------
	// Water normals and blending

	// Initialize fog transmittance used for bloomy fog
	float fogTransmittance = 1.0;

	if(material.isWater > 0.5 || frx_cameraInWater == 1) {
		#ifdef REALISTIC_WATER
			// NORMALS

			// Get TBN matrix
			vec3 tangent = normalize(cross(vertexNormal, vec3(0.0, 1.0, 1.0)));
			mat3 tbn = mat3(
				tangent,
				cross(vertexNormal, tangent),
				vertexNormal
			);

			// Math from Balint
			int face = int(dot(max(vertexNormal, 0.0), vec3(FACE_EAST, FACE_UP, FACE_SOUTH)) + dot(max(-vertexNormal, 0.0), vec3(FACE_WEST, FACE_DOWN, FACE_NORTH)) + 0.5);

			vec3 worldSpacePos = mod(sceneSpacePos + frx_cameraPos, 500.0);
			vec2 uv = frx_faceUv(worldSpacePos, face);

			// const vec2 offset = vec2(0.0, 5e-3);

			// float noiseCenter = waterHeightNoise(uv);

			// // Parallaxify
			// // uv = parallaxMapping(sceneSpacePos, tbn, uv, noiseCenter * 0.1);
			// // noiseCenter = waterHeightNoise(uv);

			// float noiseOffsetX = waterHeightNoise(uv + offset.xy);
			// float noiseOffsetY = waterHeightNoise(uv + offset.yx);

			// float deltaX = (noiseOffsetX - noiseCenter) / offset.y * 0.01;
			// float deltaY = (noiseOffsetY - noiseCenter) / offset.y * 0.01;

			vec2 waterNoise = fbmDXY(uv, 5, 1.8, 0.5) * 0.1;

			material.fragNormal = tbn * normalize(
				cross(vec3(2.0, 0.0, waterNoise.x), vec3(0.0, 2.0, waterNoise.y))
			);
		#endif

		// BLENDING

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

			vec3 pos_ws = sceneSpaceToScreenSpace(sceneSpacePos) * vec3(frxu_size, 1.0);
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
			skybox.rgb = mix(skybox.rgb, WATER_COLOR, float(frx_cameraInWater));
			
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
	#ifdef FOG
		if(frx_cameraInFluid == 0) {
			float blockDistance = min(frx_viewDistance, rcp(inversesqrt(dot(sceneSpacePos, sceneSpacePos))));

			float undergroundFactor = linearstep(0.0, 0.5, max(frx_eyeBrightness.y, material.skyLight));
			FogProfile fp = getFogProfile(undergroundFactor);

			float atmosphericFogTransmittance = exp2(-blockDistance / 2500.0 * fp.density);

			vec3 atmosphericFogScattering = textureLod(u_skybox, vec3(0.0, -1.0, 0.0), 7).rgb * 1.5;
			atmosphericFogScattering = mix(caveFogColor, atmosphericFogScattering, undergroundFactor);

			atmosphericFogTransmittance = mix(atmosphericFogTransmittance, 0.75, floor(composite_depth));

			composite = mix(atmosphericFogScattering, composite, atmosphericFogTransmittance);
		}
	#else
		//fogTransmittance = 1.0;
	#endif

	// ----------------------------------------------------------------------------------------------------
	// Weather blending
	composite = mix(composite, weather_color.rgb, weather_color.a * step(weather_depth, composite_depth));

	// ----------------------------------------------------------------------------------------------------
	// Writing to buffers
	fragColor = vec4(composite, fogTransmittance);
	fragDepth = vec4(composite_depth);
}
