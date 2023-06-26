#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/packing.glsl
#include forgetmenot:shaders/lib/inc/material.glsl
#include forgetmenot:shaders/lib/inc/lighting.glsl
#include forgetmenot:shaders/lib/inc/sky_display.glsl

uniform sampler2D u_color;
uniform usampler2D u_data;
uniform sampler2D u_depth;

uniform sampler2DArrayShadow u_shadow_map;
uniform sampler2DArray u_shadow_tex;

uniform samplerCube u_skybox;

uniform sampler2D u_transmittance;
uniform sampler2D u_sky_display;

uniform sampler2D u_smooth_uniforms;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();

	// Sample everything first, use them later to give the GPU time to read the textures
	// packedSample is sampling an RGB32UI image so we put the most distance between the sample and the usage
	uvec3 packedSample = texture(u_data, texcoord).xyz;
	float depth = texture(u_depth, texcoord).r;
	vec3 color = texture(u_color, texcoord).rgb;
	vec3 albedo = color;

	vec3 viewDir = getViewDir();
	vec3 sceneSpacePos = setupSceneSpacePos(texcoord, depth);

	if(fmn_isModdedDimension) {
		color = mix(color, pow(color, vec3(2.2)), floor(depth));
		fragColor = vec4(color, 1.0);
		return;
	}

	float emission = clamp01(frx_luminance(color) - 1.0);

	Material material = unpackMaterial(packedSample);

	#ifdef REALISTIC_METALS
		if(material.f0 > 0.999) {
			fragColor = vec4(color, 1.0);
			return;
		}
	#endif
	
	if(depth < 1.0) {
		#ifdef RTAO
			float ambientOcclusion = 1.0;

			const int numAoRays = RTAO_RAYS;
			const float rayContribution = 1.0 / numAoRays;

			const float aoStrength = RTAO_STRENGTH;

			for(int i = 0; i < numAoRays; i++) {
				vec3 rayDirWorld = generateCosineVector(material.fragNormal);
				
				vec3 rayPosView = setupViewSpacePos(texcoord, depth);
				vec3 rayDirView = frx_normalModelMatrix * rayDirWorld;

				// prevent rays from going behind the camera
				if(rayPosView.z + rayDirView.z > 0.0) continue;

				vec3 rayPosScreen = vec3(texcoord, depth);
				vec3 rayDirScreen = (
					viewSpaceToScreenSpace(rayPosView + rayDirView) - rayPosScreen
				);

				// fragColor = vec4(length(rayDirScreen));
				// return;

				float factor = step(1.0, length(rayDirScreen));
				rayDirScreen = mix(rayDirScreen, normalize(rayDirScreen), factor);

				float stepLength = mix(0.5, 0.1, factor);
				vec3 successDir = rayDirWorld;

				for(int i = 0; i < RTAO_RAY_STEPS; i++) {
					rayPosScreen += rayDirScreen * stepLength * interleavedGradient(i);

					if(clamp01(rayPosScreen) != rayPosScreen) {
						break;
					} else {
						float depthQuery = texelFetch(u_depth, ivec2(rayPosScreen.xy * frxu_size), 0).r;

						if(rayPosScreen.z > depthQuery && depthQuery != 1.0) {
							float linearDepthQuery = linearizeDepth(depthQuery);
							float linearRayDepth = linearizeDepth(rayPosScreen.z);

							float diff = abs(linearDepthQuery - linearRayDepth);
							
							if(diff < 2.0) {
								ambientOcclusion -= rayContribution * aoStrength;
							}
						}
					}
				}
			}
		#else
			float ambientOcclusion = material.vanillaAo;
		#endif

		color = basicLighting(
			color,
			sceneSpacePos,
			material.vertexNormal,
			material.fragNormal,
			material.blockLight,
			material.skyLight,
			ambientOcclusion,
			material.f0,
			material.roughness,
			material.sssAmount,
			material.isWater,
			u_skybox,
			u_transmittance,
			u_shadow_map,
			u_shadow_tex,
			true,
			16,
			texelFetch(u_smooth_uniforms, ivec2(3, 0), 0).r
		);
		
	} else {
		color = texture(u_sky_display, texcoord).rgb;
	}

	fragColor = vec4(color, 1.0);
}