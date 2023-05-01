#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_smoothing_previous;

in vec2 texcoord;

layout(location = 0) out float fragColor;

void main() {
	init();
	
	ivec2 index = ivec2(gl_FragCoord.xy);

	float result = 0.0;
	ivec2 samplingIndex = ivec2(-1);
	float smoothingFrames = 15.0;

	switch(index.x) {
		case 0: {
			result = float(frx_effectBlindness);
			samplingIndex = ivec2(0, 0);
			break;
		}
		case 1: {
			result = float(frx_effectDarkness);
			samplingIndex = ivec2(1, 0);
			break;
		}
		case 2: {
			result = frx_darknessEffectFactor;
			samplingIndex = ivec2(2, 0);
			smoothingFrames = 5.0;
			break;
		}
	}

	float smoothingFactor = 1.0 / smoothingFrames;//1.0 - exp(-1.0 / smoothingFrames);
	result = mix(texelFetch(u_smoothing_previous, samplingIndex, 0).r, result, smoothingFactor);

	fragColor = result;
}