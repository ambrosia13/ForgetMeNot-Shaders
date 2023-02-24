#include forgetmenot:shaders/lib/inc/cubemap.glsl

float getFogTransmittance(const in float blockDist, const in float undergroundFactor) {
	float fogAccumulator = length(max(0.0, blockDist - 20.0)) / 1500.0;

	float fogDensity = mix(0.5, 10.0, linearstep(0.1, -0.1, getSunVector().y));
	fogDensity *= mix(1.0, 6.0, fmn_rainFactor);
	fogDensity = mix(3.0, fogDensity, undergroundFactor);
	fogDensity = mix(fogDensity, 30.0, float(frx_worldIsNether));

	float fogTransmittance = exp2(-fogAccumulator * fogDensity);

	return fogTransmittance;
}

vec3 getFogScattering(const in vec3 viewDir, const in float vlFactor, const in float undergroundFactor, const in samplerCube skybox, const in sampler2D multiscatteringLut) {
	vec3 fogScattering = vec3(0.0);

	fogScattering = textureLod(skybox, viewDir, 7).rgb;
	fogScattering = mix(caveFogColor, fogScattering, undergroundFactor);

	return fogScattering;
}