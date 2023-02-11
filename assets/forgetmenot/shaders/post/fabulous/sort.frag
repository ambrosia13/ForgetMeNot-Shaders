#define INCLUDE_SPACES
#define INCLUDE_PACKING
#define INCLUDE_PBR
#define INCLUDE_NOISE
#define INCLUDE_IGN
#define INCLUDE_LDEPTH
#define INCLUDE_RAYTRACER
#define INCLUDE_SKY
#define INCLUDE_CUBEMAPS
#define INCLUDE_SHADOW
#define INCLUDE_LIGHTING
#include forgetmenot:shaders/lib/includes.glsl

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

uniform sampler2D u_previous_color;
uniform samplerCube u_skybox;
uniform usampler2D u_data;
uniform sampler2D u_vertex_normal;
uniform sampler2D u_depths;

uniform sampler2DArrayShadow u_shadow_map;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// this is the exact same as vanilla fabulous blending

#define NUM_LAYERS 6

vec4 color_layers[NUM_LAYERS];
float depth_layers[NUM_LAYERS];
int active_layers = 0;

void try_insert(vec4 color, float depth) {
	if(color.a == 0.0) {
		return;
	}

	color_layers[active_layers] = color;
	depth_layers[active_layers] = depth;

	int jj = active_layers++;
	int ii = jj - 1;
	while(jj > 0 && depth_layers[jj] > depth_layers[ii]) {
		float depthTemp = depth_layers[ii];
		depth_layers[ii] = depth_layers[jj];
		depth_layers[jj] = depthTemp;

		vec4 colorTemp = color_layers[ii];
		color_layers[ii] = color_layers[jj];
		color_layers[jj] = colorTemp;

		jj = ii--;
	}
}

vec3 blend(vec3 dst, vec4 src) {
	return mix(dst, src.rgb, src.a);
}

void main() {
	init();
	uvec3 samplePacked = texture(u_data, texcoord).xyz;

	vec3 vertexNormal = texture(u_vertex_normal, texcoord).xyz;

	float translucent_depth = texture(u_translucent_depth, texcoord).r;
	float particles_depth = texture(u_particles_depth, texcoord).r;

	vec4 translucent_color = texture(u_translucent_color, texcoord.xy);
	vec4 particles_color = texture(u_particles_color, texcoord);

	vec4 entity_color = texture(u_entity_color, texcoord);
	float entity_depth = texture(u_entity_depth, texcoord).r;

	vec4 weather_color = texture(u_weather_color, texcoord);
	weather_color.rgb = pow(weather_color.rgb, vec3(2.2));
	float weather_depth = texture(u_weather_depth, texcoord).r;

	vec4 clouds_color = texture(u_clouds_color, texcoord);
	clouds_color.rgb = pow(clouds_color.rgb, vec3(2.2));
	float clouds_depth = texture(u_clouds_depth, texcoord).r;

	vec3 viewDir = getViewDir();

	Material material = unpackMaterial(samplePacked);

	vertexNormal = vertexNormal * 2.0 - 1.0;

	vec3 sceneSpacePosBack = setupSceneSpacePos(texcoord, particles_depth);
	vec3 sceneSpacePosFront = setupSceneSpacePos(texcoord, translucent_depth);

	vec3 viewDirRefracted = refract(viewDir, material.fragNormal - vertexNormal, 1.0 / 1.333);
	vec2 refractCoord = mix(texcoord, sceneSpaceToScreenSpace(sceneSpacePosBack + viewDirRefracted).xy, clamp01(floor(particles_depth) + sign(particles_depth - translucent_depth)));

	translucent_depth = texture(u_translucent_depth, refractCoord).r;
	particles_depth = texture(u_particles_depth, refractCoord).r;

	vec4 main_color = texture(u_main_color, refractCoord);
	float main_depth = texture(u_main_depth, refractCoord).r;

	// Disable fabulous blending for water
	translucent_color.a = mix(translucent_color.a, 0.0, step(0.5, material.isWater));

	vec3 tdata = getTimeOfDayFactors();

	float max_depth = max(max(translucent_depth, particles_depth), main_depth);
	float min_depth = min(min(translucent_depth, particles_depth), main_depth);

	vec3 maxSceneSpacePos = setupSceneSpacePos(texcoord, max_depth);
	vec3 minSceneSpacePos = setupSceneSpacePos(texcoord, min_depth);
	
	color_layers[0] = main_color;
	depth_layers[0] = main_depth;
	active_layers = 1;

	try_insert(translucent_color, translucent_depth);
	try_insert(entity_color, entity_depth);
	try_insert(weather_color, weather_depth);
	try_insert(particles_color, particles_depth);

	vec3 composite = color_layers[0].rgb;
	for (int ii = 1; ii < active_layers; ++ii) {
		composite = blend(composite, color_layers[ii]);
	}

	if(material.isWater > 0.5 || frx_cameraInWater == 1) {
		//composite *= 0.5;

		// These should eventually be configurable
		const float WATER_DIRT_AMOUNT = 0.25;
		const vec3 WATER_COLOR = vec3(0.0, 0.20, 0.25);

		float waterFogDistance = mix(distance(maxSceneSpacePos, minSceneSpacePos), length(minSceneSpacePos * 0.1), float(frx_cameraInWater));
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

			reflectColor = skybox.rgb * material.skyLight;
		}

		composite *= mix(vec3(1.0), reflectColor, step(0.999, material.f0));
		composite = mix(composite, reflectColor, reflectance * step(material.f0, 0.999));
	}

	{
		if(frx_cameraInWater == 0) {
			float blockDistance = min(frx_viewDistance, rcp(inversesqrt(dot(minSceneSpacePos, minSceneSpacePos))));

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
				vlFactor = linearstep(150.0, 200.0, blockDistance);
			#endif

			float fogAccumulator = length(blockDistance) / 1500.0;
			if(frx_worldIsOverworld == 1) fogAccumulator *= mix(1.0, 0.0 * exp(-viewDir.y * 5.0), floor(min_depth));


			float fogTransmittance = exp2(-fogAccumulator);
			vec3 fogScattering = 2.0 * sampleAllCubemapFaces(u_skybox).rgb;
			fogScattering += vlFactor * 0.15 * textureLod(u_skybox, frx_skyLightVector, 2).rgb * getMiePhase(dot(viewDir, frx_skyLightVector), 0.9) * frx_skyLightTransitionFactor;
			fogScattering += vlFactor * 0.15 * textureLod(u_skybox, -frx_skyLightVector, 2).rgb * getMiePhase(dot(viewDir, -frx_skyLightVector), 0.9) * frx_skyLightTransitionFactor;
			fogScattering *= max(frx_smoothedEyeBrightness.y, material.skyLight);

			composite = mix(fogScattering, composite, fogTransmittance);
		}
	}

	fragColor = composite.rgbb * FMN_MASK.xxxy + FMN_MASK.yyyx;
}
