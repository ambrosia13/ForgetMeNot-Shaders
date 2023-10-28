#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/lighting.glsl

uniform sampler2D u_color;
uniform sampler2D u_depth;

uniform sampler2D u_transmittance;
uniform sampler2D u_multiscattering;

uniform sampler2DArrayShadow u_shadow_map;
uniform sampler2DArray u_shadow_tex;

uniform samplerCube u_skybox;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// Used for tracing against sky
float rayPlaneIntersection(vec3 rayPos, vec3 rayDir, vec3 planeNormal, float planeHeight) {
	return -(dot(rayPos, planeNormal) + planeHeight) / dot(rayDir, planeNormal);
}

float getVolumetricLightFactor(in vec3 sceneSpacePos, in vec3 viewDir, in float depth) {
	vec3 startPos = vec3(0.0);
	vec3 endPos = viewDir * min(frx_viewDistance * 0.1, length(sceneSpacePos));

	const int volumetricLightSteps = 10;
	vec3 rayPos = startPos;
	vec3 rayStep = (endPos - startPos) / float(volumetricLightSteps);

	float volumetricLightFactor = 0.0;
	for(int i = 0; i < volumetricLightSteps; i++) {
		rayPos += rayStep * interleavedGradient(i);

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

	return volumetricLightFactor * distance(startPos, endPos);
}

vec3 getAerialPerspective(in vec3 viewDir) {
	vec3 color = vec3(0.0);

	vec3 tdata = getTimeOfDayFactors();

	const float tMax = 0.025;
	
	if(tdata.x + tdata.z > 0.0) {
		color += raymarchScattering(skyViewPos, viewDir, getSunVector(), tMax, 32.0, 0.0, u_transmittance, u_multiscattering) * 20.0;
	}
	
	if(tdata.y + tdata.z > 0.0) {
		color += nightAdjust(raymarchScattering(skyViewPos, viewDir, getMoonVector(), tMax, 32.0, 0.0, u_transmittance, u_multiscattering) * 20.0);
	}

	return color *= 1.6;
}

vec3 getVolumetricLight(in vec3 sceneSpacePos, in vec3 viewDir, in float depth) {
	vec3 vlColor = 8.0 * getValFromTLUT(u_transmittance, skyViewPos, frx_skyLightVector);

	if(frx_worldIsMoonlit == 1) {
		vlColor = nightAdjust(vlColor);
	}

	if(frx_cameraInWater == 1) {
		vlColor *= normalize(WATER_COLOR);
	}

	float VdotL = (dot(viewDir, frx_skyLightVector));
	float phase = getMiePhase(VdotL, 0.6);

	return 0.01 * vlColor * getVolumetricLightFactor(sceneSpacePos, viewDir, depth) * phase;
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

			float fogMultiplier = mix(1.0 + 2.0 * frx_smoothedEyeBrightness.y, 15.0, float(frx_worldIsNether));
			fogMultiplier = mix(fogMultiplier, 0.0, float(frx_cameraInWater));
			float transmittance = exp(-blockDistance / fmn_atmosphereParams.blocksPerFogUnit * fogMultiplier);

			if(frx_worldIsOverworld == 1) {
				float undergroundFactor = linearstep(0.0, 0.5, frx_smoothedEyeBrightness.y);
				undergroundFactor = mix(1.0, undergroundFactor, float(frx_worldHasSkylight));
				
				if(undergroundFactor > 0.01) {
					scattering = getAerialPerspective(viewDir);
				}

				scattering = mix(caveFogColor, scattering, undergroundFactor);
			} else {
				scattering = interpolateCubemap(u_skybox, viewDir).rgb;
			}

			color = mix(scattering, color, transmittance);
		} else {
			color = mix(color, pow(frx_fogColor.rgb, vec3(2.2)), smoothstep(frx_fogStart, frx_fogEnd, blockDistance));
		}
	}

	#define VOLUMETRIC_LIGHT
	#ifdef VOLUMETRIC_LIGHT
		if(!fmn_isModdedDimension) {
			vec3 volumetricLight = getVolumetricLight(sceneSpacePos, viewDir, depth);
			color += volumetricLight;
		}
	#endif


	fragColor = vec4(color, 1.0);
}