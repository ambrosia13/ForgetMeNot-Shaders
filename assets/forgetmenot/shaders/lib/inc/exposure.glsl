/*
#include forgetmenot:shaders/lib/inc/exposure.glsl
*/

struct ExposureProfile {
	float bias;
	float minExposure;
	float maxExposure;
	float exposureMultiplier;
};

ExposureProfile getOverworldExposureProfile() {
	return ExposureProfile(0.4, MIN_EXPOSURE_OVERWORLD, MAX_EXPOSURE_OVERWORLD, EXPOSURE_MULTIPLIER_OVERWORLD);
}
ExposureProfile getNetherExposureProfile() {
	return ExposureProfile(0.2, MIN_EXPOSURE_NETHER, MAX_EXPOSURE_NETHER, EXPOSURE_MULTIPLIER_NETHER);
}
ExposureProfile getEndExposureProfile() {
	return ExposureProfile(0.2, MIN_EXPOSURE_END, MAX_EXPOSURE_END, EXPOSURE_MULTIPLIER_END);
}

ExposureProfile getExposureProfile() {
	if(frx_worldIsNether == 1) return getNetherExposureProfile();
	if(frx_worldIsEnd == 1) return getEndExposureProfile();
	return getOverworldExposureProfile();
}

float getExposureValue(const in ExposureProfile ep, const in float luminance) {
	float ev100 = log2(luminance * 100.0 * ep.bias / 12.5);
	float exposureValue = 1.0 / (1.2 * exp2(ev100));

	return clamp(exposureValue, ep.minExposure, ep.maxExposure);
}
float getExposureValue(const in float luminance) {
	return getExposureValue(getExposureProfile(), luminance);
}
