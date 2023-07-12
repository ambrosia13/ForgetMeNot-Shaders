#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl

uniform sampler2D u_color;
uniform sampler2D u_depth;

uniform sampler2D u_aerial_perspective;
uniform samplerCube u_skybox;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

vec3 getAerialPerspectiveSlice(int layerIndex) {
	ivec2 layer = ivec2(layerIndex % 15, layerIndex / 15);
	vec2 coord = texcoord / 16.0 + layer * vec2(15.0 / 225.0);
	
	return texture(u_aerial_perspective, coord).rgb;
}

void main() {
	initGlobals();
	
	vec3 color = texture(u_color, texcoord).rgb;
	float depth = texture(u_depth, texcoord).r;

	vec3 sceneSpacePos = setupSceneSpacePos(texcoord, depth);
	vec3 viewDir = getViewDir();

	if(depth != 1.0) {
		float blockDistance = length(sceneSpacePos);

		// Fog
		if(!fmn_isModdedDimension) {
			vec3 scattering = vec3(0.0);
			float transmittance = exp(-blockDistance / fmn_atmosphereParams.blocksPerFogUnit * 2.0);

			if(frx_worldIsOverworld == 1) {
				float undergroundFactor = linearstep(0.0, 0.5, frx_smoothedEyeBrightness.y);
				undergroundFactor = mix(1.0, undergroundFactor, float(frx_worldHasSkylight));

				// vec3[] scatteringValues = vec3[2](vec3(0.0), vec3(0.0));
				// vec3 timeFactors = getTimeOfDayFactors();
				
				// if(timeFactors.x + timeFactors.z > 0.0) {
				// 	scatteringValues[0] = raymarchScattering(
				// 		skyViewPos, viewDir, getSunVector(),
				// 		blockDistance / 1e4, 16.0,
				// 		u_transmittance, u_multiscattering
				// 	) * 20.0;
				// }

				// if(timeFactors.y + timeFactors.z > 0.0) {
				// 	scatteringValues[1] = raymarchScattering(
				// 		skyViewPos, viewDir, getMoonVector(),
				// 		blockDistance / 1e4, 16.0,
				// 		u_transmittance, u_multiscattering
				// 	) * 20.0;
				// 	scatteringValues[1] = nightAdjust(scatteringValues[1]);
				// }

				// scattering = scatteringValues[0] + scatteringValues[1];
				int fogDistanceWhole = int(blockDistance / 2.0);
				scattering = getAerialPerspectiveSlice(min(fogDistanceWhole, 225));

				scattering = mix(caveFogColor, scattering, undergroundFactor);
			} else {
				scattering = textureLod(u_skybox, viewDir, 7).rgb;
			}

			color = mix(scattering, color, transmittance);
		} else {
			color = mix(color, pow(frx_fogColor.rgb, vec3(2.2)), smoothstep(frx_fogStart, frx_fogEnd, blockDistance));
		}
	}

	fragColor = vec4(color, 1.0);
}