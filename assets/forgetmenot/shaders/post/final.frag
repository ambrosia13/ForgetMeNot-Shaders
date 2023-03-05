#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;
in float exposure;

layout(location = 0) out vec4 fragColor;

struct ExposureProfile {
	float bias;
	float minExposure;
	float maxExposure;
};

ExposureProfile getOverworldExposureProfile() {
	return ExposureProfile(0.4, 0.4, 2.0);
}
ExposureProfile getNetherExposureProfile() {
	return ExposureProfile(0.2, 1.5, 2.0);
}
ExposureProfile getEndExposureProfile() {
	return ExposureProfile(0.2, 1.0, 1.4);
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
float getExposureValue() {
	return getExposureValue(exposure);
}

void main() {
	init();

	vec3 color = texture(u_color, texcoord).rgb;

	#ifdef CHROMATIC_ABBERATION
		color.r = texture(u_color, texcoord + vec2(5.0 / frxu_size.x, 0.0)).r;
		color.b = texture(u_color, texcoord - vec2(5.0 / frxu_size.x, 0.0)).b;
	#endif

	#ifdef LSD_MODE
		vec2 noise = vec2(smoothHash(texcoord * 30.0 + frx_renderSeconds * 0.1), smoothHash(texcoord * 30.0 + 1000.0 - frx_renderSeconds * 0.1)) * 0.005;

		#define texcoord (texcoord+noise)
		color.r = frx_sample13(u_color, texcoord + 0.01 * vec2(sin(frx_renderSeconds), cos(frx_renderSeconds)), 1.0 / frxu_size).r;
		color.g = frx_sample13(u_color, texcoord + 0.01 * vec2(2.0 * -sin(frx_renderSeconds + 50.0), cos(frx_renderSeconds + 50.0)), 1.0 / frxu_size).g;
		color.b = frx_sample13(u_color, texcoord + 0.01 * vec2(sin(frx_renderSeconds - 50.0), 2.0 * -cos(frx_renderSeconds - 50.0)), 1.0 / frxu_size).b;
	#endif

	vec3 finalColor = color.rgb;

	#ifdef ENABLE_BLOOM
		finalColor *= getExposureValue();
	#endif

	// aces tonemap
	finalColor = FRX_ACES_INPUT_MATRIX * finalColor;
	finalColor = FRX_RRT_AND_ODTF_FIT(finalColor * 1.0);
	finalColor = FRX_ACES_OUTPUT_MATRIX * finalColor;

	// vibrance(finalColor, 0.05);
	// liftGammaGain(finalColor, 0.0075, 1.0, 2.0);
	// saturation(finalColor, 0.5);
	// finalColor *= normalize(vec3(0.8, 1.4, 2.7));

	// finally, back into srgb
	finalColor = clamp01(pow(finalColor, vec3(1.0 / 2.2)));

	const int bitDepth = 256;
	finalColor = floor(finalColor * bitDepth + randF()) / bitDepth;

	fragColor = vec4(finalColor, 1.0);
}