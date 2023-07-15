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
	layerIndex = min(layerIndex, 24);

	ivec2 layer = ivec2(layerIndex % 5, layerIndex / 5);
	vec2 coord = texcoord / 5.0 + layer * vec2(45.0 / 225.0);
	
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

			float fogMultiplier = mix(3.0, 15.0, float(frx_worldIsNether));
			float transmittance = exp(-blockDistance / fmn_atmosphereParams.blocksPerFogUnit * fogMultiplier);

			if(frx_worldIsOverworld == 1) {
				float undergroundFactor = linearstep(0.0, 0.5, frx_smoothedEyeBrightness.y);
				undergroundFactor = mix(1.0, undergroundFactor, float(frx_worldHasSkylight));

				const float distanceFactor = 15.0;

				int fogDistanceWhole = int(blockDistance / distanceFactor);
				float fogDistancePart = fract(blockDistance / distanceFactor);
				fogDistancePart = fogDistancePart * fogDistancePart * (3.0 - 2.0 * fogDistancePart);
				
				scattering = getAerialPerspectiveSlice(fogDistanceWhole);
				scattering = mix(scattering, getAerialPerspectiveSlice(fogDistanceWhole + 1), fogDistancePart);

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