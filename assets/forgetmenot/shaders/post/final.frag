#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;
in float exposure;

layout(location = 0) out vec4 fragColor;

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

	finalColor = frx_toneMap(finalColor);

	// finally, back into srgb
	finalColor = clamp01(pow(finalColor, vec3(1.0 / 2.2)));

	const int bitDepth = 256;
	finalColor = floor(finalColor * bitDepth + randF()) / bitDepth;

	fragColor = vec4(finalColor, 1.0);
}