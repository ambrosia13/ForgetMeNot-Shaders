/*
#include forgetmenot:shaders/lib/inc/fog.glsl

Contains various things for working with fog densities and color.
*/

struct FogProfile {
	float density;
	float amount;
	float scale;
};

FogProfile getOverworldFogProfile(const in float undergroundFactor, const in float fogFalloff) {
	FogProfile fp;

	// Density modifiers
	fp.density = mix(15.0, 1.0, fogFalloff);

	// Density absolutes
	fp.density = mix(fp.density, 15.0, fmn_rainFactor);
	fp.density = mix(20.0, fp.density, undergroundFactor);

	// Amount modifiers
	fp.amount = mix(0.6, 0.0, fogFalloff);

	// Amount absolutes
	fp.amount = mix(fp.amount, 0.7, fmn_rainFactor);
	fp.amount = mix(0.35, fp.amount, undergroundFactor);
	fp.amount = mix(fp.amount, 0.0, float(frx_cameraInWater));

	// Scale modifiers
	fp.scale = 1.0;

	// Scale absolutes
	fp.scale = mix(3.0, fp.scale, undergroundFactor);

	return fp;
}

FogProfile getNetherFogProfile() {
	return FogProfile(15.0, 0.45, 3.0);
}

FogProfile getEndFogProfile() {
	return FogProfile(15.0, 0.3, 3.0);
}

FogProfile getFogProfile(const in float undergroundFactor) {
	if(frx_worldIsNether == 1) return getNetherFogProfile();
	if(frx_worldIsEnd == 1) return getEndFogProfile();
	
	//float fogFalloff = linearstep(0.0, 0.2, getSunVector().y);
	return getOverworldFogProfile(undergroundFactor, 0.5);
}

vec3 getFogScattering(const in vec3 viewDir, const in float vlFactor, const in float undergroundFactor, const in samplerCube skybox, const in sampler2D multiscatteringLut) {
	vec3 fogScattering = vec3(0.0);

	fogScattering = textureLod(skybox, viewDir, 7).rgb;
	fogScattering = mix(caveFogColor, fogScattering, undergroundFactor);

	return fogScattering;
}