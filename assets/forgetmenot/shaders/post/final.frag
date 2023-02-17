#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;
in float exposure;

layout(location = 0) out vec4 fragColor;

void vibrance(inout vec3 color, float intensity) {
    float mn       = min(color.r, min(color.g, color.b));
    float mx       = max(color.r, max(color.g, color.b));
    float sat      = (1.0 - clamp01(mx - mn)) * clamp01(1.0 - mx) * frx_luminance(color) * 5.0;
    vec3 lightness = vec3((mn + mx) * 0.5);

    // Vibrance
    color = mix(color, mix(lightness, color, intensity), sat);
    // Negative vibrance
    color = mix(color, lightness, (1.0 - lightness) * (1.0 - intensity) * 0.5 * abs(intensity));
}

void saturation(inout vec3 color, float intensity) {
    color = mix(vec3(frx_luminance(color)), color, intensity);
}

void contrast(inout vec3 color, float contrast) {
    color = (color - 0.5) * contrast + 0.5;
}

// http://filmicworlds.com/blog/minimal-color-grading-tools/
void liftGammaGain(inout vec3 color, float lift, float gamma, float gain) {
    vec3 lerpV = clamp01(pow(color, vec3(gamma)));
    color = gain * lerpV + lift * (1.0 - lerpV);
}

void main() {
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
		finalColor *= 0.5 / clamp(exposure * 0.9 + 0.1, 0.1, 1.5);
	#endif

	// aces tonemap
	finalColor = frx_toneMap(finalColor * 1.0);

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