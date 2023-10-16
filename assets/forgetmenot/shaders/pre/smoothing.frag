#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_smoothing_previous;

in vec2 texcoord;

layout(location = 0) out float fragColor;

void main() {
	initGlobals();
	
	ivec2 index = ivec2(gl_FragCoord.xy);

	float result = 0.0;
	float smoothingFrames = 15.0;

	switch(index.x) {
		case 0: {
			result = float(frx_effectBlindness);
			break;
		}
		case 1: {
			result = float(frx_effectDarkness);
			break;
		}
		case 2: {
			result = frx_darknessEffectFactor;
			smoothingFrames = 5.0;
			break;
		}
		case 3: {
			#ifndef FULLBRIGHT
				result = float(frx_effectNightVision);
			#else
				result = 1.0;
			#endif
			
			break;
		}
	}

	float smoothingFactor = 1.0 / smoothingFrames;
	result = mix(texelFetch(u_smoothing_previous, index, 0).r, result, smoothingFactor);

	fragColor = result;
}