#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_color;
uniform sampler2D u_previous;

in vec2 texcoord;

layout(location = 0) out float avgLuminance;

void main() {
	init();

	avgLuminance = 0.0;
	const int luminanceLod = 7;

	vec2 size = textureSize(u_color, luminanceLod);
	float totalWeight;

	// float texelMaxLuminance = 0.0, texelMinLuminance = 100.0;

	for(int x = 0; x < size.x; x++) {
		for(int y = 0; y < size.y; y++) {
			float distToCenter = length(vec2(x, y) / size - 0.5);
			float currentWeight = 1.0;
			float currentSample = frx_luminance(texelFetch(u_color, ivec2(x, y), luminanceLod).rgb);
			currentSample = min(currentSample, 5.0);

			// texelMaxLuminance = max(texelMaxLuminance, currentSample);
			// texelMinLuminance = min(texelMinLuminance, currentSample);

			avgLuminance += currentSample * currentWeight;
			totalWeight += currentWeight;
		}
	}

	// avgLuminance -= texelMaxLuminance + texelMinLuminance;
	avgLuminance /= totalWeight;

	float prevLuminance = texelFetch(u_previous, ivec2(0), 0).r;

	float smoothingFactor = 1.0 - exp(-1.0 / 30.0);
	if(frx_renderFrames > 1u) avgLuminance = max(0.0, mix(prevLuminance, avgLuminance, smoothingFactor));
}