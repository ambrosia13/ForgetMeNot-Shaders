#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/exposure.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl 
#include forgetmenot:shaders/lib/inc/zcam_tonemapper.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;
in float exposure;

layout(location = 0) out vec4 fragColor;

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

// Lottes 2016, "Advanced Techniques and Optimization of HDR Color Pipelines"
vec3 lottes(vec3 x, float whitePoint) {
	const vec3 a = vec3(1.6);
	const vec3 d = vec3(0.977);
	 
	vec3 hdrMax = vec3(whitePoint);
	
	const vec3 midIn = vec3(0.18);
	const vec3 midOut = vec3(0.267);

	vec3 b =
		(-pow(midIn, a) + pow(hdrMax, a) * midOut) /
		((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);
	vec3 c =
		(pow(hdrMax, a * d) * pow(midIn, a) - pow(hdrMax, a) * pow(midIn, a * d) * midOut) /
		((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);

	return pow(x, a) / (pow(x, a * d) * b + c);
}

void main() {
	initGlobals();

	vec3 color = texture(u_color, texcoord).rgb;

	// Purkinje effect
	float purkinjeFactor = clamp01(1.0 - exp2(-frx_luminance(color * 40.0)));
	color = mix(color, saturation(color, 0.0) * vec3(0.5, 1.2, 1.8) + PURKINJE_LIFT, (1.0 - purkinjeFactor) * PURKINJE_AMOUNT);

	#ifdef ENABLE_BLOOM
		color *= getExposureValue() * getExposureProfile().exposureMultiplier;
	#endif

	#define WHITE_POINT 8.0

	//#define DEBUG_POST_PROCESSING
	#ifdef DEBUG_POST_PROCESSING
		float _contrast = 1.0;
		float _saturation = 1.0;
		float _vibrance = 1.0;

		vec3 lift = vec3(0.0, 0.0, 0.0);
		vec3 gamma = vec3(1.0, 1.0, 1.0);
		vec3 gain = vec3(1.0, 1.0, 1.0);

		#define CONTRAST _contrast
		#define SATURATION _saturation
		#define VIBRANCE _vibrance

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

	#if CAMERA_PRESET == PRESET_MOODY
		#define WHITE_POINT 4.0

		#define CONTRAST 1.15
		#define SATURATION 0.85
		#define VIBRANCE 1.0

		vec3 lift = vec3(0.0, 0.0, 0.0);
		vec3 gamma = vec3(1.0, 1.0, 1.0);
		vec3 gain = vec3(1.0, 1.0, 1.0);
	
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

	#ifdef ENABLE_POST_PROCESSING
		// Contrast in log-scale to preserve more color detail
		color = log(color);
		color = contrast(color, CONTRAST);
		color = exp(color);

		color = saturation(color, SATURATION);
	#endif

	#ifndef ACES_TONEMAP
		color = lottes(color * 0.45, WHITE_POINT);
	#else
		color = frx_toneMap(color);
	#endif

	#ifdef ENABLE_POST_PROCESSING
		color = vibrance(color, VIBRANCE);

		// Lift-gamma-gain component-wise
		color.r = clamp01(liftGammaGain(color.r, LIFT_R, GAMMA_R, GAIN_R));
		color.b = clamp01(liftGammaGain(color.b, LIFT_G, GAMMA_G, GAIN_G));
		color.g = clamp01(liftGammaGain(color.g, LIFT_B, GAMMA_B, GAIN_B));
	#endif 

	color = clamp01(pow(color, vec3(1.0 / 2.2)));
	fragColor = vec4(color, 1.0);
}