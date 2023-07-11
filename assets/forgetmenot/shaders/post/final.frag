#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

layout(rgba16) uniform image2D u_color_img;

in vec2 texcoord;
in float exposure;

layout(location = 0) out vec4 fragColor;

struct ExposureProfile {
	float bias;
	float minExposure;
	float maxExposure;
	float exposureMultiplier;
};

ExposureProfile getOverworldExposureProfile() {
	return ExposureProfile(0.5, 0.9, 5.7, 0.75);
}
ExposureProfile getNetherExposureProfile() {
	return ExposureProfile(0.2, 1.5, 2.0, 0.75);
}
ExposureProfile getEndExposureProfile() {
	return ExposureProfile(0.2, 1.0, 1.4, 1.5);
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

// Post-processing stuff, provided by belmu
vec3 vibrance(vec3 color, float intensity) {
	float mn = min(color.r, min(color.g, color.b));
	float mx = max(color.r, max(color.g, color.b));
	float sat = (1.0 - clamp01(mx - mn)) * clamp01(1.0 - mx) * frx_luminance(color) * 5.0;
	vec3 lightness = vec3((mn + mx) * 0.5);

	// Vibrance
	color = mix(color, mix(lightness, color, intensity), sat);
	// Negative vibrance
	color = mix(color, lightness, (1.0 - lightness) * (1.0 - intensity) * 0.5 * abs(intensity));

	return color;
}

// http://filmicworlds.com/blog/minimal-color-grading-tools/
// component-wise
float liftGammaGain(float color, float lift, float gamma, float gain) {
    float lerpV = clamp01(pow(color, gamma));
    color = gain * lerpV + lift * (1.0 - lerpV);

    return color;
}

void main() {
	initGlobals();

	vec3 color = texture(u_color, texcoord).rgb;

	// Purkinje effect
	float purkinjeFactor = clamp01(1.0 - exp2(-frx_luminance(color * 40.0)));
	color = mix(saturation(color, 0.0) * vec3(0.5, 1.2, 1.8) + PURKINJE_LIFT, color, purkinjeFactor * PURKINJE_AMOUNT);

	#ifdef ENABLE_BLOOM
		color *= getExposureValue() * getExposureProfile().exposureMultiplier;
	#endif

	// Contrast in log-scale to preserve more color detail
	color = log(color);
	color = contrast(color, CONTRAST);
	color = exp(color);

	color = saturation(color, SATURATION);
	color = vibrance(color, VIBRANCE);

	color = frx_toneMap(color);

	//#define DEBUG_LIFT_GAMMA_GAIN
	#ifdef DEBUG_LIFT_GAMMA_GAIN
		vec3 lift = vec3(-0.01, 0.0, 0.0);
		vec3 gamma = vec3(1.4, 0.9, 1.0);
		vec3 gain = vec3(0.9, 1.0, 1.0);

		#define LIFT_R lift.r
		#define LIFT_G lift.g
		#define LIFT_B lift.b

		#define GAMMA_R gamma.r
		#define GAMMA_G gamma.g
		#define GAMMA_B gamma.b

		#define GAIN_R gain.r
		#define GAIN_G gain.g
		#define GAIN_B gain.b
	#endif

	// Lift-gamma-gain component-wise
	color.r = clamp01(liftGammaGain(color.r, LIFT_R, GAMMA_R, GAIN_R));
	color.b = clamp01(liftGammaGain(color.b, LIFT_G, GAMMA_G, GAIN_G));
	color.g = clamp01(liftGammaGain(color.g, LIFT_B, GAMMA_B, GAIN_B));

	imageStore(u_color_img, ivec2(0), vec4(1.0));

	// finally, back into srgb
	color = clamp01(pow(color, vec3(1.0 / 2.2)));

	const int bitDepth = 256;
	color = floor(color * bitDepth + randomFloat()) / bitDepth;

	fragColor = vec4(color, 1.0);
}